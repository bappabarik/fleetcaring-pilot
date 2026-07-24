import { getDb } from "./db";
import { generateIdempotencyKey } from "@/lib/uuid";
import { shiftsApi, type BreakReason } from "@/api/shifts";
import { ordersApi } from "@/api/orders";

export type ActionStatus = "pending" | "in_flight" | "failed";
export type ActionType = "START_SHIFT" | "END_SHIFT" | "START_BREAK" | "END_BREAK" | "ENROUTE_ORDER" | "CONFIRM_ARRIVAL";

interface ActionPayloads {
    START_SHIFT: { shiftId: string };
    END_SHIFT: { shiftId: string };
    START_BREAK: { shiftId: string; reason: BreakReason };
    END_BREAK: { shiftId: string; breakId: string };
    ENROUTE_ORDER: { orderId: string };
    CONFIRM_ARRIVAL: { orderId: string };
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
    }
}