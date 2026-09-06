---
name: notion-book-publisher
description: Hướng dẫn Agent quy trình dịch sách kỹ thuật, viết series tutorials dài kỳ từ thư mục Markdown cục bộ và tự động xuất bản lên Notion dưới dạng Master Book Hub kết hợp Database quản lý tiến độ, tự động điều hướng trước/sau và chèn biểu đồ vector Mermaid chuẩn.
---

# Notion Book & Tutorial Publisher Skill

Kỹ năng này hướng dẫn AI Agent cách tổ chức, biên soạn, dịch thuật ngữ kỹ thuật và tự động xuất bản các bộ sách hoặc series tutorial nhiều chương từ thư mục Markdown cục bộ lên Notion.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Mô hình Hybrid**: Không xuất bản dạng trang mẹ - trang con hỗn loạn. Luôn sử dụng mô hình **Master Book Hub** chứa **Inline Database** để quản lý tiến độ (`Status`), thứ tự (`Order`), số từ (`Words`), và nhãn chuyên đề (`Tags`).
2. **Quy Chuẩn Định Dạng (Strict Notion Formatting)**:
   - **Tuyệt đối không gửi raw markdown** (`**bold**`, `*italic*`, `` `code` ``) dạng plain text vào Notion.
   - **Bắt buộc dùng Native Mermaid Block** (`language: "mermaid"`) cho sơ đồ kiến trúc. Không dùng ASCII Art.
   - **Sử dụng HTML Embed (`embed`)** cho các biểu đồ tương tác, benchmark dashboard, hoặc simulator trực tiếp:
     ```markdown
     ```html-embed
     https://your-host.com/interactive-report.html
     ```
     hoặc `<iframe src="https://your-host.com/interactive-report.html"></iframe>`
     ```
3. **Cơ Chế Đồng Bộ Gia Tăng (Incremental Sync)**:
   - Khi cập nhật sách, chỉ cập nhật những chương có nội dung thay đổi (so khớp mã băm SHA256 `FileHash`).

---

## 2. Quy Trình Dịch & Tổ Chức Thư Mục Markdown

Khi được yêu cầu viết hoặc dịch một cuốn sách, Agent phải tổ chức thư mục như sau:

```text
my-book-folder/
├── 01-tong-quan.md
├── 02-kien-truc-co-ban.md
├── 03-chuyen-sau/
│   ├── 01-phan-tich-kernel.md
│   └── 02-benchmark.md
└── 04-ket-luan.md
```

### Cấu Trúc File Chuẩn (Kèm Frontmatter):
```markdown
---
title: "Tiêu đề chương sách hoặc bài hướng dẫn"
order: 1
tags: ["Chủ đề 1", "Chủ đề 2"]
status: "Đã hoàn thành" # hoặc "Bản nháp", "Chưa dịch"
---

# Tiêu đề chương

Nội dung chương sách...

\`\`\`mermaid
graph TD
    A[Client] --> B[Server]
\`\`\`
```

---

## 3. Quy Trình Xuất Bản Lên Notion (Execution Steps)

Khi nhận lệnh đồng bộ sách lên Notion:
1. **Kiểm tra Parent Page**: Xác định `parent_page_id` trên Notion nơi cuốn sách sẽ tọa lạc (có thể dùng tool `notion_search` để tìm trang phù hợp).
2. **Kích hoạt MCP Tool**:
   Gọi công cụ `notion_sync_book_database`:
   - `folder_path`: Đường dẫn tuyệt đối tới thư mục Markdown.
   - `parent_page_id`: ID trang cha trên Notion.
   - `book_title`: Tên cuốn sách hoặc tutorial series.
   - `book_icon`: Emoji đại diện (mặc định "📚").
   - `enable_footer_nav`: `true` để tự sinh thanh điều hướng `[⬅️ Chương trước] • [Mục lục] • [Chương sau ➡️]`.
3. **Báo cáo kết quả**: Cung cấp đường link trực tiếp tới Master Page trên Notion để người dùng mở xem ngay lập tức.
