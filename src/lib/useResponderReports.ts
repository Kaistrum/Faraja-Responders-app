import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { CrisisReport } from "@/types";
import * as api from "@/lib/api";
import { UnauthorizedError } from "@/lib/api";

interface UseResponderReportsOptions {
	pollMs?: number; // 0 disables polling
	onNewAssignments?: (fresh: CrisisReport[]) => void;
}

export function useResponderReports({ pollMs = 60_000, onNewAssignments }: UseResponderReportsOptions = {}) {
	const { responder, logout } = useAuth();
	const [reports, setReports] = useState<CrisisReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [failedCount, setFailedCount] = useState(0);
	const knownIds = useRef<Set<string> | null>(null);
	const onNewRef = useRef(onNewAssignments);
	onNewRef.current = onNewAssignments;

	const load = useCallback(async (isRefresh = false) => {
		if (!responder) return;
		if (!isRefresh) setLoading(true);
		try {
			const { reports: fresh, failedCount: failed } = await api.loadResponderReports(responder.responder_id);
			setReports(fresh);
			setFailedCount(failed);
			setError(null);

			if (knownIds.current && onNewRef.current) {
				const newOnes = fresh.filter(r => !knownIds.current!.has(r.id));
				if (newOnes.length > 0) onNewRef.current(newOnes);
			}
			knownIds.current = new Set(fresh.map(r => r.id));
		} catch (err) {
			if (err instanceof UnauthorizedError) {
				logout();
				return;
			}
			setError(err instanceof Error ? err.message : "Failed to load reports");
		} finally {
			setLoading(false);
		}
	}, [responder, logout]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (!pollMs || !responder) return;
		const id = setInterval(() => load(true), pollMs);
		return () => clearInterval(id);
	}, [pollMs, responder, load]);

	// Optimistic: flips the row locally, PATCHes, and rolls back + surfaces
	// the error if the backend rejects it.
	const markAttended = useCallback(
		async (report: CrisisReport, notes: string) => {
			const prev = reports;
			setReports(p =>
				p.map(r =>
					r.id === report.id
						? { ...r, status: "attended" as const, assignmentStatus: "completed" as const, attendedAt: new Date().toISOString(), notes: notes || r.notes }
						: r
				)
			);
			try {
				await api.markAssignmentCompleted(report.id, notes);
			} catch (err) {
				setReports(prev);
				if (err instanceof UnauthorizedError) {
					logout();
					return;
				}
				setError(err instanceof Error ? err.message : "Failed to update assignment");
			}
		},
		[reports, logout]
	);

	return { reports, loading, error, failedCount, refresh: load, markAttended, setError };
}
