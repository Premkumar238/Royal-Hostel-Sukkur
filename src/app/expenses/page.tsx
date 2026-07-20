"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { STAFF_ROLES, ensureStaffCategory, isSalaryPaidForMonth } from "@/lib/staffUtils";
import { createLinkedMessExpenseRecord } from "@/lib/messExpenseUtils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type { Employee, EmployeeRole, Expense, MessExpense } from "@/types/database";
import {
  Search,
  Plus,
  X,
  Calendar,
  DollarSign,
  Tag,
  Receipt,
  User,
  Trash2,
  Users,
  Banknote,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const { currentHostel } = useHostel();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messExpenses, setMessExpenses] = useState<MessExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showLogModal, setShowLogModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showInitialMessModal, setShowInitialMessModal] = useState(false);
  const [showDailyMessModal, setShowDailyMessModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState<EmployeeRole>("Watchman");
  const [employeeSalary, setEmployeeSalary] = useState<number | "">("");
  const [employeePhone, setEmployeePhone] = useState("");

  const [messBillingMonth, setMessBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [initialMessAmount, setInitialMessAmount] = useState<number | "">("");
  const [initialMessDescription, setInitialMessDescription] = useState("");
  const [dailyMessAmount, setDailyMessAmount] = useState<number | "">("");
  const [dailyMessDate, setDailyMessDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyMessDescription, setDailyMessDescription] = useState("");

  const supabase = createClient();
  const messBillingMonthDate = `${messBillingMonth}-01`;

  const fetchData = async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [expRes, catRes, empRes, messRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("*, expense_categories(name)")
        .eq("hostel_id", currentHostel.id)
        .order("expense_date", { ascending: false }),
      supabase
        .from("expense_categories")
        .select("id, name")
        .eq("hostel_id", currentHostel.id)
        .order("name", { ascending: true }),
      supabase
        .from("employees")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
      supabase
        .from("mess_expenses")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("billing_month", messBillingMonthDate)
        .order("expense_date", { ascending: true }),
    ]);

    if (expRes.data) setExpenses(expRes.data as unknown as Expense[]);
    if (catRes.data) setCategories(catRes.data as ExpenseCategory[]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    if (messRes.data) setMessExpenses(messRes.data as MessExpense[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentHostel, messBillingMonth]);

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const { error } = await supabase.from("expenses").insert([
      {
        hostel_id: currentHostel.id,
        category_id: categoryId || null,
        title,
        description: description || null,
        vendor: vendor || null,
        amount: Number(amount) || 0,
        expense_date: expenseDate,
        status: "paid",
      },
    ]);

    if (!error) {
      setShowLogModal(false);
      fetchData();
    } else {
      alert(error.message);
    }
    setFormLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !newCatName) return;
    setFormLoading(true);

    const { error } = await supabase.from("expense_categories").insert([
      { hostel_id: currentHostel.id, name: newCatName },
    ]);

    if (!error) {
      setNewCatName("");
      setShowCatModal(false);
      fetchData();
    } else {
      alert(error.message);
    }
    setFormLoading(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !employeeName.trim()) return;
    setFormLoading(true);

    await ensureStaffCategory(supabase, currentHostel.id, employeeRole);

    const { error } = await supabase.from("employees").insert([
      {
        hostel_id: currentHostel.id,
        full_name: employeeName.trim(),
        role: employeeRole,
        monthly_salary: Number(employeeSalary) || 0,
        phone: employeePhone.trim() || null,
        status: "active",
      },
    ]);

    setFormLoading(false);

    if (!error) {
      setShowEmployeeModal(false);
      setEmployeeName("");
      setEmployeeRole("Watchman");
      setEmployeeSalary("");
      setEmployeePhone("");
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handlePaySalary = async (employee: Employee) => {
    if (!currentHostel) return;

    const salaryMonth = new Date().toISOString().slice(0, 7);
    if (isSalaryPaidForMonth(employee.last_salary_paid_at, salaryMonth)) {
      alert(`${employee.full_name} salary is already marked paid for this month.`);
      return;
    }

    if (!confirm(`Pay salary of ${formatCurrency(employee.monthly_salary)} to ${employee.full_name}?`)) return;

    setFormLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const categoryIdForRole = await ensureStaffCategory(supabase, currentHostel.id, employee.role);

    const { error: expenseError } = await supabase
      .from("expenses")
      .insert([
        {
          hostel_id: currentHostel.id,
          category_id: categoryIdForRole,
          employee_id: employee.id,
          title: `${employee.role} Salary - ${employee.full_name}`,
          description: `Monthly salary payment for ${employee.role}`,
          vendor: employee.full_name,
          amount: employee.monthly_salary,
          expense_date: today,
          status: "paid",
        },
      ])
      .select("id")
      .single();

    if (expenseError) {
      setFormLoading(false);
      alert(expenseError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update({ last_salary_paid_at: new Date().toISOString() })
      .eq("id", employee.id);

    setFormLoading(false);

    if (!updateError) {
      alert(`Salary paid successfully to ${employee.full_name}`);
      fetchData();
    } else {
      alert(updateError.message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Remove this employee from staff list?")) return;
    const { error } = await supabase.from("employees").update({ status: "inactive" }).eq("id", id);
    if (!error) fetchData();
    else alert(error.message);
  };

  const initialMessExpense = messExpenses.find((item) => item.expense_type === "initial") ?? null;
  const dailyMessExpenses = messExpenses.filter((item) => item.expense_type === "daily");
  const dailyMessTotal = dailyMessExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const messGrandTotal =
    Number(initialMessExpense?.amount || 0) + dailyMessTotal;

  const salaryMonth = new Date().toISOString().slice(0, 7);

  const openInitialMessModal = () => {
    setInitialMessAmount(initialMessExpense?.amount ?? "");
    setInitialMessDescription(initialMessExpense?.description ?? "");
    setShowInitialMessModal(true);
  };

  const openDailyMessModal = () => {
    setDailyMessAmount("");
    setDailyMessDate(new Date().toISOString().split("T")[0]);
    setDailyMessDescription("");
    setShowDailyMessModal(true);
  };

  const handleSaveInitialMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const amount = Number(initialMessAmount) || 0;
    const expenseDate = messBillingMonthDate;

    if (initialMessExpense) {
      if (initialMessExpense.expense_id) {
        await supabase
          .from("expenses")
          .update({
            amount,
            description: initialMessDescription.trim() || null,
            expense_date: expenseDate,
          })
          .eq("id", initialMessExpense.expense_id);
      }

      const { error } = await supabase
        .from("mess_expenses")
        .update({
          amount,
          description: initialMessDescription.trim() || null,
          expense_date: expenseDate,
        })
        .eq("id", initialMessExpense.id);

      setFormLoading(false);
      if (!error) {
        setShowInitialMessModal(false);
        fetchData();
      } else {
        alert(error.message);
      }
      return;
    }

    const { expenseId, error: expenseError } = await createLinkedMessExpenseRecord(supabase, {
      hostelId: currentHostel.id,
      type: "initial",
      billingMonth: messBillingMonthDate,
      expenseDate,
      amount,
      description: initialMessDescription.trim() || null,
    });

    if (expenseError) {
      setFormLoading(false);
      alert(expenseError);
      return;
    }

    const { error } = await supabase.from("mess_expenses").insert([
      {
        hostel_id: currentHostel.id,
        expense_type: "initial",
        billing_month: messBillingMonthDate,
        expense_date: expenseDate,
        amount,
        description: initialMessDescription.trim() || null,
        expense_id: expenseId,
      },
    ]);

    setFormLoading(false);
    if (!error) {
      setShowInitialMessModal(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleAddDailyMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const amount = Number(dailyMessAmount) || 0;
    const billingMonth = `${dailyMessDate.slice(0, 7)}-01`;

    if (billingMonth !== messBillingMonthDate) {
      setFormLoading(false);
      alert("Daily expense date must fall within the selected billing month.");
      return;
    }

    const { expenseId, error: expenseError } = await createLinkedMessExpenseRecord(supabase, {
      hostelId: currentHostel.id,
      type: "daily",
      billingMonth: messBillingMonthDate,
      expenseDate: dailyMessDate,
      amount,
      description: dailyMessDescription.trim() || null,
    });

    if (expenseError) {
      setFormLoading(false);
      alert(expenseError);
      return;
    }

    const { error } = await supabase.from("mess_expenses").insert([
      {
        hostel_id: currentHostel.id,
        expense_type: "daily",
        billing_month: messBillingMonthDate,
        expense_date: dailyMessDate,
        amount,
        description: dailyMessDescription.trim() || null,
        expense_id: expenseId,
      },
    ]);

    setFormLoading(false);
    if (!error) {
      setShowDailyMessModal(false);
      setDailyMessAmount("");
      setDailyMessDescription("");
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleDeleteMessExpense = async (item: MessExpense) => {
    if (!confirm("Delete this mess expense record?")) return;

    if (item.expense_id) {
      await supabase.from("expenses").delete().eq("id", item.expense_id);
    }

    const { error } = await supabase.from("mess_expenses").delete().eq("id", item.id);
    if (!error) fetchData();
    else alert(error.message);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) fetchData();
    else alert(error.message);
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendor?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout>
      <Header title="Expense Management" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        {/* Staff Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Staff Management</h2>
              <p className="text-xs text-gray-400 mt-0.5">Add employees and pay monthly salaries</p>
            </div>
            <button
              onClick={() => {
                setEmployeeName("");
                setEmployeeRole("Watchman");
                setEmployeeSalary("");
                setEmployeePhone("");
                setShowEmployeeModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Employee</span>
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <Users className="mx-auto h-7 w-7 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-500">No staff added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add a watchman or other employee to manage salaries.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Monthly Salary</th>
                      <th className="px-6 py-4">Last Paid</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((employee) => {
                      const paidThisMonth = isSalaryPaidForMonth(
                        employee.last_salary_paid_at,
                        salaryMonth
                      );
                      return (
                      <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{employee.full_name}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{employee.phone ?? "—"}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(employee.monthly_salary, currentHostel?.currency)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {employee.last_salary_paid_at ? formatDate(employee.last_salary_paid_at) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {paidThisMonth ? (
                              <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold uppercase text-green-700">
                                Paid
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePaySalary(employee)}
                                disabled={formLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer disabled:opacity-60"
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                <span>Pay Salary</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Mess Expenses Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Mess Expense System</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Add initial monthly mess budget, then record daily mess spending
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="month"
                  value={messBillingMonth}
                  onChange={(e) => setMessBillingMonth(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={openInitialMessModal}
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{initialMessExpense ? "Update Initial Expense" : "Add Initial Expense"}</span>
              </button>
              <button
                onClick={openDailyMessModal}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Daily Expense</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Initial Monthly Expense
              </span>
              <p className="mt-1 text-2xl font-bold text-amber-900">
                {initialMessExpense
                  ? formatCurrency(initialMessExpense.amount, currentHostel?.currency)
                  : "Not set"}
              </p>
              <p className="text-xs text-amber-700/80 mt-1">{formatMonth(messBillingMonthDate)}</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                Daily Expenses Total
              </span>
              <p className="mt-1 text-2xl font-bold text-orange-800">
                {formatCurrency(dailyMessTotal, currentHostel?.currency)}
              </p>
              <p className="text-xs text-orange-700/80 mt-1">{dailyMessExpenses.length} daily entries</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Total Mess Spend
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(messGrandTotal, currentHostel?.currency)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Initial + daily for this month</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : messExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <UtensilsCrossed className="mx-auto h-7 w-7 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-500">No mess expenses for this month</p>
              <p className="text-xs text-gray-400 mt-1">
                Start with the initial monthly mess expense, then add daily expenses.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {messExpenses.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.expense_type === "initial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.expense_type === "initial" ? "Initial Monthly" : "Daily"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(item.expense_date)}</td>
                        <td className="px-6 py-4 text-gray-700">{item.description || "—"}</td>
                        <td className="px-6 py-4 font-semibold text-red-600">
                          -{formatCurrency(item.amount, currentHostel?.currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteMessExpense(item)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Expenses Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Expense Records</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track hostel operations and other costs</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowCatModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-xs"
              >
                <Tag className="h-4 w-4" />
                <span>Add Category</span>
              </button>
              <button
                onClick={() => {
                  setTitle("");
                  setCategoryId("");
                  setVendor("");
                  setAmount("");
                  setDescription("");
                  setShowLogModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Log Expense</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses by title or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-sm font-medium text-gray-500">No expenses recorded</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Expense Details</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Vendor</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 block">{exp.title}</span>
                          {exp.description && (
                            <span className="text-xs text-gray-400 line-clamp-1">{exp.description}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {exp.expense_categories?.name ?? "General"}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{exp.vendor ?? "—"}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(exp.expense_date)}</td>
                        <td className="px-6 py-4 font-semibold text-red-600">
                          -{formatCurrency(Number(exp.amount), currentHostel?.currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowEmployeeModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowEmployeeModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Add Employee</h3>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Employee Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Category
                </label>
                <select
                  value={employeeRole}
                  onChange={(e) => setEmployeeRole(e.target.value as EmployeeRole)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Monthly Salary
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min={0}
                      value={employeeSalary}
                      onChange={(e) => setEmployeeSalary(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={employeePhone}
                    onChange={(e) => setEmployeePhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer mt-2"
              >
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Create Employee"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Log Expense Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowLogModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button onClick={() => setShowLogModal(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Log Operations Expense</h3>

            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Expense Title</label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer">
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Amount Paid</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="number" required min={0} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Vendor / Supplier</label>
                <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description / Notes</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <button type="submit" disabled={formLoading} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer mt-2">
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Log Expense Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Initial Mess Expense Modal */}
      {showInitialMessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowInitialMessModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button onClick={() => setShowInitialMessModal(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {initialMessExpense ? "Update Initial Mess Expense" : "Add Initial Mess Expense"}
            </h3>
            <p className="text-xs text-gray-400 mb-6">{formatMonth(messBillingMonthDate)}</p>

            <form onSubmit={handleSaveInitialMess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Initial Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={initialMessAmount}
                    onChange={(e) => setInitialMessAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={initialMessDescription}
                  onChange={(e) => setInitialMessDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
              <button type="submit" disabled={formLoading} className="w-full rounded-lg bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer">
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : initialMessExpense ? "Update Initial Expense" : "Save Initial Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Daily Mess Expense Modal */}
      {showDailyMessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowDailyMessModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button onClick={() => setShowDailyMessModal(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-2">Add Daily Mess Expense</h3>
            <p className="text-xs text-gray-400 mb-6">For {formatMonth(messBillingMonthDate)}</p>

            <form onSubmit={handleAddDailyMess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={dailyMessDate}
                    onChange={(e) => setDailyMessDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={dailyMessAmount}
                    onChange={(e) => setDailyMessAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={dailyMessDescription}
                  onChange={(e) => setDailyMessDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
              <button type="submit" disabled={formLoading} className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 cursor-pointer">
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Daily Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowCatModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button onClick={() => setShowCatModal(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Create Expense Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Watchman, Electricity" className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm focus:border-blue-400 focus:outline-none" />
              <button type="submit" disabled={formLoading || !newCatName} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
                Save Category
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
