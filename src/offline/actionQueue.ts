import { getDb } from "./db";
import { generateIdempotencyKey } from "@/lib/uuid";
import { shiftsApi, type BreakReason } from "@/api/shifts";
import { ordersApi, type IssueReason } from "@/api/orders";
import { shipmentsApi } from "@/api/shipments";
import { getPhotoById } from "./photoQueue";

export type ActionStatus = "pending" | "in_flight" | "failed";

export class PhotosNotReadyError extends Error {
    constructor() {
        super("Referenced photos haven't finished uploading yet");
        this.name = "PhotosNotReadyError";
    }
}

export type ActionType =
    | "START_SHIFT"
    | "END_SHIFT"
    | "START_BREAK"
    | "END_BREAK"
    | "ENROUTE_ORDER"
    | "CONFIRM_ARRIVAL"
    | "SUBMIT_PRE_CHECK"
    | "SUBMIT_POST_CHECK"
    | "RAISE_ISSUE"
    | "COMPLETE_ORDER";

interface ActionPayloads {
    START_SHIFT: { shiftId: string };
    END_SHIFT: { shiftId: string };
    START_BREAK: { shiftId: string; reason: BreakReason };
    END_BREAK: { shiftId: string; breakId: string };
    ENROUTE_ORDER: { orderId: string };
    CONFIRM_ARRIVAL: { orderId: string };
    SUBMIT_PRE_CHECK: { shipmentId: string; photoQueueIds: string[]; notes?: string };
    SUBMIT_POST_CHECK: { shipmentId: string; photoQueueIds: string[]; notes?: string };
    RAISE_ISSUE: {
        orderId: string;
        shipmentId?: string;
        reason: IssueReason;
        notes?: string;
        photoQueueIds: string[];
    };
    COMPLETE_ORDER: { orderId: string };
}

export interface QueuedAction<T extends ActionType = ActionType> {
    id: string;
    actionType: T;
    payload: ActionPayloads[T];
    status: ActionStatus;
    errorMessage: string | null;
    createdAt: string;
}

interface ActionQueueRow {
    id: string;
    actionType: ActionType;
    payload: string;
    status: ActionStatus;
    errorMessage: string | null;
    createdAt: string;
}

function rowToAction(row: ActionQueueRow): QueuedAction {
    return { ...row, payload: JSON.parse(row.payload) };
}

export async function enqueueAction<T extends ActionType>(
    actionType: T,
    payload: ActionPayloads[T]
): Promise<string> {
    const db = await getDb();
    const id = generateIdempotencyKey();
    await db.runAsync(
        "INSERT INTO action_queue (id, actionType, payload, status, createdAt) VALUES (?, ?, ?, 'pending', ?)",
        id,
        actionType,
        JSON.stringify(payload),
        new Date().toISOString()
    );
    return id;
}

export async function getPendingActions(): Promise<QueuedAction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ActionQueueRow>(
        "SELECT * FROM action_queue WHERE status = 'pending' ORDER BY createdAt ASC"
    );
    return rows.map(rowToAction);
}

export async function hasPendingActionMatching<T extends ActionType>(
    actionType: T,
    matches: (payload: ActionPayloads[T]) => boolean
): Promise<boolean> {
    const pending = await getPendingActions();
    return pending.some((a) => a.actionType === actionType && matches(a.payload as ActionPayloads[T]));
}

export async function getFailedActions(): Promise<QueuedAction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ActionQueueRow>(
        "SELECT * FROM action_queue WHERE status = 'failed' ORDER BY createdAt DESC"
    );
    return rows.map(rowToAction);
}

export async function markActionStatus(id: string, status: ActionStatus, errorMessage?: string) {
    const db = await getDb();
    await db.runAsync("UPDATE action_queue SET status = ?, errorMessage = ? WHERE id = ?", status, errorMessage ?? null, id);
}

export async function deleteAction(id: string) {
    const db = await getDb();
    await db.runAsync("DELETE FROM action_queue WHERE id = ?", id);
}

export async function retryAction(id: string) {
    await markActionStatus(id, "pending");
}

export async function discardAction(id: string) {
    await deleteAction(id);
}

async function resolvePhotoUrls(photoQueueIds: string[]): Promise<string[]> {
    const urls: string[] = [];
    for (const id of photoQueueIds) {
        const photo = await getPhotoById(id);
        if (!photo || photo.status !== "uploaded" || !photo.remoteKey) {
            throw new PhotosNotReadyError();
        }
        urls.push(photo.remoteKey);
    }
    return urls;
}

export async function getActionById(id: string): Promise<QueuedAction | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<ActionQueueRow>("SELECT * FROM action_queue WHERE id = ?", id);
    return row ? rowToAction(row) : null;
}

export async function dispatchAction(action: QueuedAction): Promise<void> {
    switch (action.actionType) {
        case "START_SHIFT": {
            const { shiftId } = action.payload as ActionPayloads["START_SHIFT"];
            await shiftsApi.start(shiftId, action.id);
            return;
        }
        case "END_SHIFT": {
            const { shiftId } = action.payload as ActionPayloads["END_SHIFT"];
            await shiftsApi.end(shiftId, action.id);
            return;
        }
        case "START_BREAK": {
            const { shiftId, reason } = action.payload as ActionPayloads["START_BREAK"];
            await shiftsApi.startBreak(shiftId, reason, action.id);
            return;
        }
        case "END_BREAK": {
            const { shiftId, breakId } = action.payload as ActionPayloads["END_BREAK"];
            await shiftsApi.endBreak(shiftId, breakId, action.id);
            return;
        }
        case "ENROUTE_ORDER": {
            const { orderId } = action.payload as ActionPayloads["ENROUTE_ORDER"];
            await ordersApi.enroute(orderId, action.id);
            return;
        }
        case "CONFIRM_ARRIVAL": {
            const { orderId } = action.payload as ActionPayloads["CONFIRM_ARRIVAL"];
            await ordersApi.confirmArrival(orderId, action.id);
            return;
        }
        case "SUBMIT_PRE_CHECK": {
            const { shipmentId, photoQueueIds, notes } = action.payload as ActionPayloads["SUBMIT_PRE_CHECK"];
            const photoUrls = await resolvePhotoUrls(photoQueueIds);
            await shipmentsApi.submitPreCheck(shipmentId, { photoUrls, notes }, action.id);
            return;
        }
        case "SUBMIT_POST_CHECK": {
            const { shipmentId, photoQueueIds, notes } = action.payload as ActionPayloads["SUBMIT_POST_CHECK"];
            const photoUrls = await resolvePhotoUrls(photoQueueIds);
            await shipmentsApi.submitPostCheck(shipmentId, { photoUrls, notes }, action.id);
            return;
        }
        case "RAISE_ISSUE": {
            const { orderId, shipmentId, reason, notes, photoQueueIds } = action.payload as ActionPayloads["RAISE_ISSUE"];
            const photoUrls = await resolvePhotoUrls(photoQueueIds);
            await ordersApi.raiseIssue(orderId, { shipmentId, reason, notes, photoUrls }, action.id);
            return;
        }
        case "COMPLETE_ORDER": {
            const { orderId } = action.payload as ActionPayloads["COMPLETE_ORDER"];
            await ordersApi.complete(orderId, action.id);
            return;
        }
    }
}