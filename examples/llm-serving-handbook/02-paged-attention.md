---
title: "PagedAttention & Giải Quyết Phân Mảnh Bộ Nhớ"
order: 2
tags: ["Attention", "vLLM", "Memory"]
status: "Đã hoàn thành"
---

# PagedAttention & Giải Quyết Phân Mảnh Bộ Nhớ

Trong các hệ thống phục vụ LLM thế hệ cũ, KV Cache cho mỗi sequence phải được cấp phát trong một vùng nhớ liên tục (contiguous memory) tương ứng với độ dài tối đa dự kiến (ví dụ: 2048 hoặc 4096 tokens). Điều này dẫn đến hai loại phân mảnh nghiêm trọng:
- **Internal Fragmentation**: Vùng nhớ dự phòng không bao giờ dùng hết.
- **External Fragmentation**: Các khe nhớ nhỏ nằm rải rác không đủ lớn để chứa một sequence mới.

---

## 1. Cơ Chế Ảo Hóa Phân Trang (Virtual Memory Paging)

Lấy cảm hứng từ hệ điều hành, **PagedAttention** chia nhỏ KV Cache thành các khối cố định (**Physical Blocks**, ví dụ 16 tokens/block).

\`\`\`mermaid
graph LR
    subgraph Logical [Logical KV Cache]
        L1[Tokens 0-15: Block 0]
        L2[Tokens 16-31: Block 1]
        L3[Tokens 32-47: Block 2]
    end

    subgraph BlockTable [Block Table / Page Table]
        BT1[Logical 0 -> Physical #7]
        BT2[Logical 1 -> Physical #1]
        BT3[Logical 2 -> Physical #12]
    end

    subgraph Physical [Physical GPU Memory Blocks]
        P1[Physical Block #1]
        P7[Physical Block #7]
        P12[Physical Block #12]
    end

    L1 --> BT1 --> P7
    L2 --> BT2 --> P1
    L3 --> BT3 --> P12
\`\`\`

---

## 2. Lợi Ích Của PagedAttention
- **Giảm lãng phí bộ nhớ xuống dưới 4%**: Hầu như loại bỏ hoàn toàn internal và external fragmentation.
- **Copy-on-Write (CoW)**: Cho phép chia sẻ KV Cache giữa nhiều sequences (rất mạnh khi dùng Parallel Sampling, Beam Search hoặc Prefix Caching).
- **Tăng Batch Size**: Giúp tăng throughput phục vụ từ **2x đến 4x** trên cùng một GPU A100/H100!
