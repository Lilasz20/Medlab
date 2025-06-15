FROM node:18-alpine

WORKDIR /app

# نسخ ملفات المشروع
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# تثبيت التبعيات
RUN npm ci

# نسخ باقي الملفات
COPY . .

# تعطيل التحقق الصارم من الأنواع أثناء البناء
ENV NEXT_TELEMETRY_DISABLED 1
ENV TS_SKIP_TYPECHECK true
ENV TYPESCRIPT_SKIP_TYPECHECK true
ENV NEXT_TYPESCRIPT_CONFIG ./tsconfig.build.json

# بناء Prisma Client
RUN npx prisma generate

# بناء تطبيق Next.js بدون lint
RUN npm run build -- --no-lint

# تعريض المنفذ
EXPOSE 3000

# ✅ تنفيذ migration عند التشغيل ثم تشغيل التطبيق
CMD npx prisma migrate deploy && npm start
