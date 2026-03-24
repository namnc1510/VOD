@echo off
echo Đang khởi động Movie Backend...
start cmd /k "cd movie-backend && npm run dev"

echo Đang khởi động Movie Client...
start cmd /k "cd movie-client && npm run dev"

echo Đang khởi động Vue Vben Admin...
start cmd /k "cd vue-vben-admin && pnpm run dev"

echo Đã mở 3 cửa sổ Terminal để chạy 3 dự án!
