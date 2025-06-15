"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { User, Role } from "@/types";
import {
  Loader,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCog,
  Trash,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ConfirmationModal from "@/components/common/ConfirmationModal";

export default function UsersManagementPage() {
  const { user: currentUser, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChange, setRoleChange] = useState<{
    userId: string;
    newRole: Role;
  } | null>(null);

  // جلب قائمة المستخدمين
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في جلب بيانات المستخدمين");
      }

      const data = await response.json();
      setUsers(data);

      // فصل المستخدمين إلى قائمتين: معلقين ومعتمدين
      setPendingUsers(data.filter((user: User) => !user.approved));
      setApprovedUsers(data.filter((user: User) => user.approved));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // التحقق من أن المستخدم الحالي هو مسؤول
    if (currentUser && currentUser.role !== "ADMIN") {
      toast.error("غير مصرح لك بالوصول إلى هذه الصفحة");
      router.push("/dashboard");
      return;
    }

    if (currentUser && token) {
      fetchUsers();
    }
  }, [currentUser, token, router]);

  // التحضير لتغيير دور المستخدم مع طلب تأكيد للمستخدمين المعتمدين
  const prepareRoleChange = (userId: string, newRole: Role) => {
    const user = users.find((u) => u.id === userId);

    // إذا كان المستخدم معتمد، نطلب تأكيداً
    if (user && user.approved) {
      setRoleChange({ userId, newRole });
      setShowRoleModal(true);
    } else {
      // إذا كان غير معتمد، نغير الدور مباشرة
      changeUserRole(userId, newRole);
    }
  };

  // تغيير دور المستخدم
  const changeUserRole = async (userId: string, newRole: Role) => {
    try {
      setUpdatingRole(userId); // تعيين حالة التحميل للمستخدم المحدد

      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("فشل في تغيير دور المستخدم");
      }

      const { user: updatedUser } = await response.json();
      toast.success("تم تغيير دور المستخدم بنجاح");

      // تحديث قائمة المستخدمين في الحالة المحلية
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      );
      setUsers(updatedUsers);

      // تحديث قوائم المستخدمين المعلقين والمعتمدين
      if (!updatedUser.approved) {
        setPendingUsers(
          pendingUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      } else {
        setApprovedUsers(
          approvedUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      }
    } catch (error) {
      console.error("Error changing user role:", error);
      toast.error("حدث خطأ أثناء تغيير دور المستخدم");
    } finally {
      setUpdatingRole(null); // إنهاء حالة التحميل
    }
  };

  // الموافقة على المستخدم
  const approveUser = async (userId: string) => {
    try {
      setUpdatingRole(userId); // تعيين حالة التحميل للمستخدم المحدد

      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في الموافقة على المستخدم");
      }

      toast.success("تم الموافقة على المستخدم بنجاح");

      // تحديث قوائم المستخدمين
      const updatedUser = users.find((user) => user.id === userId);
      if (updatedUser) {
        updatedUser.approved = true;
        setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
        setApprovedUsers([...approvedUsers, updatedUser]);
      }
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("حدث خطأ أثناء الموافقة على المستخدم");
    } finally {
      setUpdatingRole(null); // إنهاء حالة التحميل
    }
  };

  // إلغاء الموافقة على المستخدم
  const revokeApproval = async (userId: string) => {
    try {
      setUpdatingRole(userId); // تعيين حالة التحميل للمستخدم المحدد

      const response = await fetch(`/api/users/${userId}/revoke`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في إلغاء الموافقة على المستخدم");
      }

      toast.success("تم إلغاء الموافقة على المستخدم بنجاح");

      // تحديث قوائم المستخدمين
      const updatedUser = users.find((user) => user.id === userId);
      if (updatedUser) {
        updatedUser.approved = false;
        setApprovedUsers(approvedUsers.filter((user) => user.id !== userId));
        setPendingUsers([...pendingUsers, updatedUser]);
      }
    } catch (error) {
      console.error("Error revoking approval:", error);
      toast.error("حدث خطأ أثناء إلغاء الموافقة على المستخدم");
    } finally {
      setUpdatingRole(null); // إنهاء حالة التحميل
    }
  };

  // حذف المستخدم
  const deleteUser = async (userId: string) => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في حذف المستخدم");
      }

      toast.success("تم حذف المستخدم بنجاح");

      // تحديث قوائم المستخدمين
      setUsers(users.filter((user) => user.id !== userId));
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
      setApprovedUsers(approvedUsers.filter((user) => user.id !== userId));

      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("حدث خطأ أثناء حذف المستخدم");
    } finally {
      setIsDeleting(false);
    }
  };

  // فتح نافذة تأكيد الحذف
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // تأكيد حذف المستخدم
  const confirmDeleteUser = () => {
    if (selectedUser) {
      deleteUser(selectedUser.id);
    }
  };

  // عرض حالة التحميل
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل بيانات المستخدمين...</p>
        </div>
      </div>
    );
  }

  // التحقق من صلاحيات المستخدم
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm">
        <p className="font-bold">خطأ في الصلاحيات</p>
        <p>ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
      </div>
    );
  }

  // تحويل الدور إلى نص عربي
  const getRoleText = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return "مسؤول";
      case "RECEPTIONIST":
        return "موظف استقبال";
      case "LAB_TECHNICIAN":
        return "فني مختبر";
      case "ACCOUNTANT":
        return "محاسب";
      case "PENDING":
        return "معلق";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-8">
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="text-indigo-600" size={24} />
          إدارة المستخدمين
        </h1>
        <div className="flex items-center">
          <div className="text-sm text-gray-600">
            إجمالي المستخدمين: {users.length}
          </div>
        </div>
      </div>

      {/* قسم المستخدمين المعلقين */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-amber-50 p-4 border-b border-amber-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            المستخدمين المعلقين ({pendingUsers.length})
          </h2>
          <p className="text-sm text-amber-700 mt-1">
            هؤلاء المستخدمين بحاجة إلى موافقة للوصول إلى النظام
          </p>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            لا يوجد مستخدمين معلقين في انتظار الموافقة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-sm">
                  <th className="py-3 px-4 text-right font-medium">الاسم</th>
                  <th className="py-3 px-4 text-right font-medium">
                    البريد الإلكتروني
                  </th>
                  <th className="py-3 px-4 text-right font-medium">
                    تاريخ التسجيل
                  </th>
                  <th className="py-3 px-4 text-right font-medium">الدور</th>
                  <th className="py-3 px-4 text-right font-medium">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{user.name}</td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", {
                        locale: ar,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            prepareRoleChange(user.id, e.target.value as Role)
                          }
                          disabled={updatingRole === user.id}
                          className="border rounded p-1.5 text-sm w-full bg-white focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="PENDING">معلق</option>
                          <option value="RECEPTIONIST">موظف استقبال</option>
                          <option value="LAB_TECHNICIAN">فني مختبر</option>
                          <option value="ACCOUNTANT">محاسب</option>
                          <option value="ADMIN">مسؤول</option>
                        </select>
                        {updatingRole === user.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                            <Loader
                              size={16}
                              className="animate-spin text-indigo-600"
                            />
                          </div>
                        )}
                      </div>
                      {!updatingRole && (
                        <div className="text-xs mt-1 text-gray-500">
                          الدور الحالي: {getRoleText(user.role)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveUser(user.id)}
                          disabled={updatingRole === user.id}
                          className="text-green-600 hover:text-green-900 flex items-center"
                          title="الموافقة على المستخدم"
                        >
                          {updatingRole === user.id ? (
                            <Loader size={16} className="animate-spin ml-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 ml-1" />
                          )}
                          <span>موافقة</span>
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={updatingRole === user.id}
                          className="text-red-600 hover:text-red-900 flex items-center mr-2"
                          title="حذف المستخدم"
                        >
                          <Trash className="h-4 w-4 ml-1" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* قسم المستخدمين المعتمدين */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-50 p-4 border-b border-green-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            المستخدمين المعتمدين ({approvedUsers.length})
          </h2>
          <p className="text-sm text-green-700 mt-1">
            هؤلاء المستخدمين لديهم صلاحية الوصول إلى النظام
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-700 text-sm">
                <th className="py-3 px-4 text-right font-medium">الاسم</th>
                <th className="py-3 px-4 text-right font-medium">
                  البريد الإلكتروني
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  تاريخ التسجيل
                </th>
                <th className="py-3 px-4 text-right font-medium">الدور</th>
                <th className="py-3 px-4 text-right font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {format(new Date(user.createdAt), "dd/MM/yyyy", {
                      locale: ar,
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          prepareRoleChange(user.id, e.target.value as Role)
                        }
                        disabled={
                          updatingRole === user.id || user.id === currentUser.id
                        }
                        className={`border rounded p-1.5 text-sm w-full bg-white focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          user.id === currentUser.id ? "bg-gray-100" : ""
                        }`}
                      >
                        <option value="PENDING">معلق</option>
                        <option value="RECEPTIONIST">موظف استقبال</option>
                        <option value="LAB_TECHNICIAN">فني مختبر</option>
                        <option value="ACCOUNTANT">محاسب</option>
                        <option value="ADMIN">مسؤول</option>
                      </select>
                      {updatingRole === user.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                          <Loader
                            size={16}
                            className="animate-spin text-indigo-600"
                          />
                        </div>
                      )}
                      {!updatingRole && (
                        <div className="text-xs mt-1 text-gray-500">
                          الدور الحالي: {getRoleText(user.role)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user.id !== currentUser.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => revokeApproval(user.id)}
                          disabled={updatingRole === user.id}
                          className="text-amber-600 hover:text-amber-900 flex items-center"
                          title="إلغاء الموافقة"
                        >
                          {updatingRole === user.id ? (
                            <Loader size={16} className="animate-spin ml-1" />
                          ) : (
                            <XCircle className="h-4 w-4 ml-1" />
                          )}
                          <span>إلغاء</span>
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={updatingRole === user.id}
                          className="text-red-600 hover:text-red-900 flex items-center mr-2"
                          title="حذف المستخدم"
                        >
                          <Trash className="h-4 w-4 ml-1" />
                          <span>حذف</span>
                        </button>
                      </div>
                    )}
                    {user.id === currentUser.id && (
                      <span className="text-xs text-gray-500 italic">
                        (المستخدم الحالي)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تأكيد الحذف */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="تأكيد حذف المستخدم"
        message={`هل أنت متأكد من رغبتك في حذف المستخدم "${
          selectedUser?.name || ""
        }"؟`}
        type="delete"
        isLoading={isDeleting}
        onConfirm={confirmDeleteUser}
        onCancel={() => setShowDeleteModal(false)}
        infoContent={
          selectedUser && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">
                معلومات المستخدم:
              </h4>
              <ul className="space-y-1">
                <li>
                  <span className="text-gray-600">الاسم:</span>{" "}
                  {selectedUser.name}
                </li>
                <li>
                  <span className="text-gray-600">البريد الإلكتروني:</span>{" "}
                  {selectedUser.email}
                </li>
                <li>
                  <span className="text-gray-600">الدور:</span>{" "}
                  {getRoleText(selectedUser.role)}
                </li>
                <li>
                  <span className="text-gray-600">الحالة:</span>{" "}
                  {selectedUser.approved ? "معتمد" : "معلق"}
                </li>
              </ul>
            </div>
          )
        }
      />

      {/* نافذة تأكيد تغيير الدور */}
      <ConfirmationModal
        isOpen={showRoleModal}
        title="تأكيد تغيير دور المستخدم"
        message={`هل أنت متأكد من رغبتك في تغيير دور المستخدم؟`}
        type="edit"
        confirmText="تغيير الدور"
        isLoading={roleChange ? updatingRole === roleChange.userId : false}
        onConfirm={() => {
          if (roleChange) {
            changeUserRole(roleChange.userId, roleChange.newRole);
            setShowRoleModal(false);
            setRoleChange(null);
          }
        }}
        onCancel={() => {
          setShowRoleModal(false);
          setRoleChange(null);
        }}
        infoContent={
          roleChange && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">
                تفاصيل التغيير:
              </h4>
              <ul className="space-y-1">
                <li>
                  <span className="text-gray-600">المستخدم:</span>{" "}
                  {users.find((u) => u.id === roleChange.userId)?.name}
                </li>
                <li>
                  <span className="text-gray-600">الدور الحالي:</span>{" "}
                  {getRoleText(
                    users.find((u) => u.id === roleChange.userId)?.role as Role
                  )}
                </li>
                <li>
                  <span className="text-gray-600">الدور الجديد:</span>{" "}
                  {getRoleText(roleChange.newRole)}
                </li>
              </ul>
              <div className="mt-3 text-amber-600 text-sm">
                <p>ملاحظة: تغيير الدور سيؤثر على صلاحيات المستخدم في النظام.</p>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
