@echo off
:: ======================================================
:: THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP (ADMIN & DEMO)
:: ======================================================
:: 🔐 Tài khoản Quản trị (Admin):
:: Xem mật khẩu trong .env hoặc database (Mặc định: Admin@123456)
:: ------------------------------------------------------
:: 🛡️ Tài khoản Demo (Người dùng thường):
:: Xem mật khẩu trong .env hoặc database (Mặc định: Demo@123456)
:: ======================================================

echo Đang khởi động Movie Backend...
start cmd /k "cd movie-backend && npm run dev"

echo Đang khởi động Movie Client...
start cmd /k "cd movie-client && npm run dev"

echo Đang khởi động Vue Vben Admin...
start cmd /k "cd vue-vben-admin && pnpm run dev"

echo Đã mở 3 cửa sổ Terminal để chạy 3 dự án!
