# Homework 3 — Resilient Event Hub

## Mục tiêu

Landing page tĩnh bằng HTML5, CSS và JavaScript ES modules cho sự kiện mẫu “UIT Data & Web Meetup”. Bài tập tập trung vào ba phần độc lập: countdown UTC không drift, form đăng ký theo state machine, và chống gửi trùng/XSS. Toàn bộ tên, địa điểm, nội dung và thời gian hiện tại đều là dữ liệu minh họa.

## Chạy trang

Không cần cài package hoặc framework. Từ thư mục repo, chạy:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8000/` trong trình duyệt. Hãy dùng HTTP local thay vì mở `index.html` bằng `file://`. Biểu mẫu chỉ được bật sau khi JavaScript tải; khi JavaScript tắt, nút gửi bị khóa và trang hiển thị thông báo.

## Chạy kiểm tra

Cần Node.js có hỗ trợ `node:test`; không cần dependency bên ngoài:

```powershell
node --test tests/*.test.mjs
```

Kiểm tra ở lần bàn giao này chạy bằng Node.js 24.15.0. Bộ kiểm tra có 24 test: parse/tính countdown, lifecycle và cleanup, state machine/service, contract của cấu hình và HTML.

## Thay thông tin sự kiện

Sửa một nguồn cấu hình tại [event-config.mjs](./event-config.mjs):

- `title`, `description`, `venue`, `address` và `agenda` chứa nội dung sự kiện.
- `startsAtUtc` phải là timestamp UTC ISO 8601 hợp lệ có hậu tố `Z`. Mẫu hiện tại là `2026-12-20T02:00:00Z`.
- `timeZone` quyết định cách hiển thị giờ địa phương; `timeZoneLabel` là nhãn đọc được cho người tham dự.

Mốc mẫu tương ứng 09:00 ngày 20/12/2026 tại `Asia/Ho_Chi_Minh`. Nếu đổi thời gian hoặc địa điểm, hãy thay cả dữ liệu cấu hình và rà lại nhãn múi giờ. Trang cập nhật tiêu đề, thời gian, địa điểm và chương trình từ cấu hình.

## Kiến trúc

- [countdown.mjs](./countdown.mjs) là phần thuần: `parseUtcDeadline` xác thực ISO UTC và `getCountdownParts` tính từ `deadlineMs - nowMs`. Phần bootstrap parse cấu hình một lần rồi dùng chung kết quả cho nội dung thời gian và countdown.
- [event-ui.mjs](./event-ui.mjs) nối countdown với DOM. Interval chỉ kích hoạt lần tính mới; khi tab hiện lại, UI tính ngay từ đồng hồ hiện tại. Hết hạn hoặc deadline lỗi được thông báo một lần. Hàm khởi tạo trả cleanup; `WeakMap` thay instance cũ khi khởi tạo lại cùng root.
- [registration.mjs](./registration.mjs) giữ một state duy nhất: `idle`, `submitting`, `success`, hoặc `error`. State đó điều khiển nút, `aria-busy` và thông báo. Guard chặn submit lần hai trong lúc Promise còn pending.
- `submitRegistration(payload)` mô phỏng thời gian chờ 800 ms rồi resolve ổn định. Controller nhận service thay thế để kiểm tra pending, success và rejection mà không cần nút debug.
- Tên, email và lời nhắn được trim. Họ tên chỉ có khoảng trắng bị từ chối bằng custom validity; email vẫn dùng kiểm tra native `type="email"`. Bản demo không hiển thị lại các trường người dùng nhập. Dữ liệu từ form không được đưa vào markup; cấu hình và thông báo được ghi bằng `textContent` hoặc tạo node rõ ràng.

Đây là kiểm tra phía trình duyệt cho bản demo. Nếu sau này thêm backend, backend phải xác thực lại mọi trường và mã hóa dữ liệu theo ngữ cảnh trước khi hiển thị.

## Giới hạn dịch vụ mô phỏng

Không có backend, đăng ký thật, lưu trữ, tài khoản, thanh toán hoặc gửi dữ liệu qua mạng. Service mẫu chỉ chờ rồi trả kết quả mô phỏng; Promise rejection trong test được tạo có chủ đích bằng fake service. Không dùng lỗi ngẫu nhiên. Thông tin trong form không được lưu lại.

## Kết quả kiểm tra thực tế

Kiểm tra cuối được chạy qua HTTP local bằng Python 3.12.10 và Codex in-app browser:

- `node --test tests/*.test.mjs`: **24 passed, 0 failed**.
- Countdown: deadline tương lai, đã qua, không hợp lệ, mốc ngày/giờ/phút/giây, đồng hồ giả, callback trễ, tab quay lại, dừng timer và cleanup đều được kiểm tra. Các trường hợp UI phụ thuộc timer dùng fake timer/document.
- Form: chuyển state thành công; pending lặp chỉ gọi service một lần; rejection giữ dữ liệu, thoát `submitting` và cho thử lại. Các tình huống pending/rejection dùng fake service.
- Trình duyệt: mốc mẫu hiển thị 09:00; form thành công qua bàn phím; tên toàn khoảng trắng và email sai bị chặn; chuỗi `<img src=x onerror=alert(1)>` không tạo phần tử ảnh hoặc hộp thoại.
- Bố cục: không tràn ngang ở viewport 375, 768 và 1440px. Trong browser dùng để kiểm tra, các cặp `clientWidth / scrollWidth` lần lượt là 360/360, 753/753 và 1425/1425.
- Bàn phím: Tab vào skip link rồi logo, Shift+Tab quay lại skip link; focus có outline rõ; nhãn trường và vùng status được kiểm tra. Enter gửi form được kiểm tra trên luồng thành công.
- Không JavaScript: bản thử HTTP không có module xác nhận nút bị khóa; nhấn Enter không đưa dữ liệu vào query string. Bản chạy JavaScript bật nút sau khi controller khởi tạo.
- Tải trang cuối: Console không có lỗi/cảnh báo; local server trả `favicon.svg` 200 cùng các module cần thiết. Không đo Lighthouse; điểm 100 không phải điều kiện của HW3.

## AI failure audit

[AI_FAILURE_AUDIT.md](./AI_FAILURE_AUDIT.md) ghi ba lỗi thực tế đã tái hiện trong quá trình review: header tràn ở mobile, form GET làm lộ dữ liệu trong URL khi JavaScript không hoạt động, và favicon bị 404. Mỗi mục có cách tái hiện, chẩn đoán, nguyên nhân, cách sửa và bằng chứng sau sửa.

## Chuẩn bị bảo vệ bài

- Giải thích vì sao countdown luôn tính lại từ deadline và đồng hồ hiện tại, thay vì trừ một biến mỗi giây.
- Chỉ ra `parseUtcDeadline`, `getCountdownParts`, `startCountdown` và cleanup/visibility listener.
- Trình bày bốn state, các transition hợp lệ, guard pending và cách fake service kiểm tra rejection/retry.
- Giải thích vì sao dữ liệu form không được dựng thành HTML, vì sao client validation không thay thế server validation, và vì sao submit bị khóa trước khi JavaScript sẵn sàng.
- Xem lịch sử theo thứ tự task bằng `git log --oneline --reverse`. Các commit tương ứng với đặc tả, HTML, CSS, countdown, form, validation, kiểm tra và audit.

## Git

Repo local trên nhánh `main`, không có remote và chưa push. `TASK_DECOMPOSITION.md` và `project-rules.md` được tạo trước khi viết mã; mỗi task được kiểm tra và commit riêng.
