import { queryOptions } from "@tanstack/react-query";
import { getPublicEventWorkflow } from "./event-workflow.functions";

export const publicEventWorkflowQuery = queryOptions({
  queryKey: ["event-workflow-visible"],
  queryFn: () => getPublicEventWorkflow(),
  staleTime: 60_000,
  refetchInterval: 30_000,
});
