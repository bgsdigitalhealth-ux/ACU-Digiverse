export const DEPARTMENT_USER_LIMIT = 2;
export type DepartmentAccount = { id: string; role: string; college: string | null; dept: string | null };

export function departmentHasUserSlot(accounts: DepartmentAccount[], college: string, department: string, excludeId?: string) {
  return accounts.filter(account => account.id !== excludeId && account.role === "dept" && account.college === college && account.dept === department).length < DEPARTMENT_USER_LIMIT;
}