# توثيق API لنظام MedLab

## المقدمة

هذا التوثيق يشرح كيفية استخدام واجهة برمجة التطبيقات (API) لنظام MedLab. النظام مبني باستخدام Next.js و Prisma مع قاعدة بيانات MySQL.

## المتطلبات الأساسية

- Postman أو أي أداة مشابهة لاختبار API
- توكن المصادقة (JWT Token)
- معرف المستخدم وصلاحياته

## المصادقة

جميع طلبات API تتطلب مصادقة باستخدام JWT Token. يمكن الحصول على التوكن من خلال تسجيل الدخول.

### تسجيل الدخول

```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123"
}
```

الاستجابة ستتضمن:

- توكن المصادقة
- معلومات المستخدم
- يجب حفظ التوكن لاستخدامه في الطلبات اللاحقة

## نقاط النهاية (Endpoints)

### 1. إدارة المرضى

#### الحصول على قائمة المرضى

```http
GET /api/patients
Authorization: Bearer <token>
```

معلمات البحث الاختيارية:

- `search`: للبحث في الاسم أو رقم الملف أو رقم الهاتف
- `page`: رقم الصفحة (الافتراضي: 1)
- `limit`: عدد النتائج في الصفحة (الافتراضي: 50)

#### الحصول على بيانات مريض محدد

```http
GET /api/patients/{id}
Authorization: Bearer <token>
```

#### الحصول على فحوصات مريض

```http
GET /api/patients/{id}/tests
Authorization: Bearer <token>
```

#### الحصول على فواتير مريض

```http
GET /api/patients/{id}/invoices
Authorization: Bearer <token>
```

### 2. إدارة الفحوصات

#### الحصول على قائمة الفحوصات

```http
GET /api/tests
Authorization: Bearer <token>
```

معلمات البحث الاختيارية:

- `search`: للبحث في اسم الفحص أو التصنيف
- `category`: تصنيف الفحص
- `page`: رقم الصفحة
- `limit`: عدد النتائج في الصفحة

#### إضافة فحص جديد

```http
POST /api/tests
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "اسم الفحص",
    "category": "التصنيف",
    "price": 100,
    "description": "وصف الفحص"
}
```

#### تخصيص فحص لمريض

```http
POST /api/tests/assign
Authorization: Bearer <token>
Content-Type: application/json

{
    "patientId": "معرف_المريض",
    "testId": "معرف_الفحص"
}
```

### 3. إدارة العينات

#### الحصول على بيانات عينة

```http
GET /api/samples/{sampleCode}
Authorization: Bearer <token>
```

#### تحديث نتائج العينة

```http
POST /api/samples/{sampleCode}/results
Authorization: Bearer <token>
Content-Type: application/json

{
    "results": {
        "param1": "value1",
        "param2": "value2"
    }
}
```

### 4. إدارة الفواتير

#### الحصول على قائمة الفواتير

```http
GET /api/invoices
Authorization: Bearer <token>
```

معلمات البحث الاختيارية:

- `search`: للبحث في رقم الفاتورة
- `status`: حالة الفاتورة (PAID, UNPAID, PARTIAL)
- `startDate`: تاريخ البداية
- `endDate`: تاريخ النهاية
- `page`: رقم الصفحة
- `limit`: عدد النتائج في الصفحة

#### الحصول على فاتورة محددة

```http
GET /api/invoices/{id}
Authorization: Bearer <token>
```

### 5. التقارير

#### توليد تقرير جديد

```http
POST /api/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
    "type": "FINANCIAL",
    "period": "THIS_MONTH",
    "startDate": "2024-01-01", // مطلوب فقط إذا كانت الفترة CUSTOM
    "endDate": "2024-01-31"    // مطلوب فقط إذا كانت الفترة CUSTOM
}
```

أنواع التقارير المتاحة:

- `FINANCIAL`: تقارير مالية
- `OPERATIONAL`: تقارير تشغيلية
- `PERFORMANCE`: تقارير الأداء

الفترات الزمنية المتاحة:

- `TODAY`
- `YESTERDAY`
- `THIS_WEEK`
- `LAST_WEEK`
- `THIS_MONTH`
- `LAST_MONTH`
- `CUSTOM`

#### الحصول على تقرير محدد

```http
GET /api/reports/{id}
Authorization: Bearer <token>
```

### 6. لوحة التحكم

#### الحصول على إحصائيات لوحة التحكم

```http
GET /api/dashboard
Authorization: Bearer <token>
```

## رموز الحالة (Status Codes)

- `200`: نجاح الطلب
- `201`: تم إنشاء العنصر بنجاح
- `400`: طلب غير صالح
- `401`: غير مصرح (مصادقة مطلوبة)
- `403`: محظور (صلاحيات غير كافية)
- `404`: العنصر غير موجود
- `500`: خطأ في الخادم

## ملاحظات هامة

1. جميع الطلبات تتطلب توكن مصادقة صالح
2. يجب إضافة التوكن في هيدر `Authorization` بصيغة `Bearer <token>`
3. بعض العمليات تتطلب صلاحيات محددة حسب دور المستخدم
4. جميع التواريخ يجب أن تكون بصيغة ISO 8601
5. جميع الاستجابات تكون بصيغة JSON

## أدوار المستخدمين والصلاحيات

- `ADMIN`: صلاحيات كاملة
- `RECEPTIONIST`: إدارة المرضى والمواعيد
- `LAB_TECHNICIAN`: إدارة الفحوصات والعينات
- `ACCOUNTANT`: إدارة الفواتير والتقارير المالية
