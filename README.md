# Custom Notion MCP Server

An enhanced, production-ready **Model Context Protocol (MCP)** server for Notion, designed specifically for AI coding assistants (Google Antigravity, Claude Desktop, Cursor).

Unlike the raw OpenAPI MCP server from NotionHQ which exposes 24 low-level endpoints with manual JSON payload requirements, this custom server provides **high-level, resilient tools** with built-in Notion best practices.

---

## 🚀 Key Advantages Over Official MCP Server

| Tính năng | Official `@notionhq/notion-mcp-server` | Custom Notion MCP Server |
| :--- | :--- | :--- |
| **Markdown Parsing** | Chỉ hỗ trợ raw OpenAPI hoặc markdown endpoint đơn lẻ | **Tự động chuyển Markdown sang Notion Blocks** kèm đầy đủ `annotations` (bold, italic, code, links) |
| **Sơ đồ Diagrams** | Không có helper, AI dễ tạo ASCII art bị cắt xén | **Native Mermaid Code Block (`language: "mermaid"`)** render vector SVG responsive trên Notion |
| **Rate Limit (429)** | Lỗi ngay lập tức nếu gửi quá nhanh | **Tự động Exponential Backoff retry & phục hồi socket hang up** |
| **Chunking** | Giới hạn 100 blocks gây lỗi nếu gửi tài liệu dài | **Tự động chia batch 100 blocks + 350ms pause** mượt mà |
| **Đọc Page Hierarchy** | Phải gọi phân trang & duyệt từng block thủ công | **`notion_get_page_content` đệ quy** và tự chuyển về Markdown sạch cho AI đọc |
| **Token Usage** | Tốn context do schema OpenAPI khổng lồ | **Gọn nhẹ, tập trung vào đúng các công cụ thiết thực** |

---

## 🛠️ Danh Sách Tools Cung Cấp

### 1. `notion_append_markdown`
- **Mô tả**: Tự động parse chuỗi Markdown tự nhiên thành cấu trúc Block chuẩn của Notion (Headings, Bullet/Numbered lists, To-Do, Quotes, Code blocks, Dividers).
- **Điểm mạnh**: Tự động bóc tách inline formatting (`**bold**`, `*italic*`, `` `code` ``, `[link](url)`) sang `rich_text` annotations chuẩn Notion. Tự động chia nhỏ mảng blocks thành từng đợt 100 blocks.

### 2. `notion_insert_mermaid`
- **Mô tả**: Chèn một sơ đồ Mermaid vào Notion.
- **Điểm mạnh**: Tự bọc vào code block với `language: "mermaid"`, Notion tự render thành biểu đồ Vector SVG trực quan, hỗ trợ zoom/pan và responsive, loại bỏ hoàn toàn lỗi tràn khung của ASCII Art.

### 3. `notion_get_page_content`
- **Mô tả**: Đọc toàn bộ nội dung của trang Notion.
- **Tham số**:
  - `format`: `"markdown"` (mặc định) hoặc `"json"`
  - `recursive`: `true` (đệ quy lấy toàn bộ khối con lồng nhau)
  - `max_depth`: Độ sâu đệ quy tối đa (mặc định 5)

### 4. `notion_create_page`
- **Mô tả**: Tạo trang mới dưới một trang cha hoặc một database.
- **Hỗ trợ**: Title, Icon emoji, Cover image URL, và nội dung Markdown khởi tạo.

### 5. `notion_search`
- **Mô tả**: Tìm kiếm nhanh trang hoặc database theo từ khóa.
- **Tham số**: `query`, `filter_type` (`"all"` | `"page"` | `"database"`), `page_size`.

### 6. `notion_update_page_markdown`
- **Mô tả**: Gọi endpoint Enhanced Markdown chính thức của Notion để ghi đè toàn bộ trang (`replace_content`).

---

## 📦 Cài Đặt & Phát Triển

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Build Dự Án
```bash
npm run build
```
File bundle đầu ra sẽ nằm tại `dist/index.js`.

### 3. Chạy Thử Nghiệm
```bash
npm test # Chạy bộ test converter
npm run dev # Chạy server ở chế độ watch
```

---

## ⚙️ Cấu Hình MCP Client

### Cấu hình trong `mcp_config.json` (Antigravity IDE / Claude Desktop / Cursor)

```json
{
  "mcpServers": {
    "custom-notion-mcp": {
      "command": "node",
      "args": [
        "/Users/admin/Desktop/Recents/Notion MCP/dist/index.js"
      ],
      "env": {
        "NOTION_API_KEY": "ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "NOTION_VERSION": "2022-06-28"
      }
    }
  }
}
```
*(Server cũng tương thích ngược nếu bạn truyền `OPENAPI_MCP_HEADERS` dạng cũ).*
