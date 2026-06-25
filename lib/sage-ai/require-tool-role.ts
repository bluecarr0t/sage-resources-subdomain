/**
 * Role gate for Sage AI tools that perform sensitive writes
 * (e.g. build_feasibility_brief inserting into the reports table).
 *
 * Unlike the route-level `requireAdminAuth`, this runs inside a tool's
 * execute() — return an `{error, data: null}` envelope instead of throwing
 * so the AI SDK surfaces the failure to the model rather than crashing
 * the stream.
 */

export type UserRole = 'admin' | 'author';

export interface ToolRoleContext {
  userRole?: UserRole | null;
  toolName: string;
}

export interface RoleDenied {
  error: string;
  data: null;
}

/**
 * Require `required` role. Admin-only tools reject authors.
 */
export function assertToolRole(
  ctx: ToolRoleContext,
  required: UserRole
): RoleDenied | null {
  const order: Record<UserRole, number> = { author: 0, admin: 1 };
  const actual = ctx.userRole ?? 'author';
  if (order[actual] >= order[required]) {
    return null;
  }
  return {
    error: `Tool ${ctx.toolName} requires role=${required} (current role=${actual}). Ask an admin to perform this action.`,
    data: null,
  };
}
