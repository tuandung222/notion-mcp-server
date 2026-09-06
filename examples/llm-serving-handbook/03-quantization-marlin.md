---
title: "Marlin Kernel & Tối Ưu Hóa W4A16 GEMM"
order: 3
tags: ["Quantization", "Marlin", "FP16/INT4"]
status: "Bản nháp"
---

# Marlin Kernel & Tối Ưu Hóa W4A16 GEMM

Khi phục vụ các mô hình siêu lớn (ví dụ Llama-3-70B), việc tải trọng số 16-bit (FP16/BF16) chiếm tới ~140 GB VRAM. Phương pháp **Weight-Only Quantization (W4A16)** nén trọng số mô hình xuống 4-bit (chỉ còn ~35 GB), giúp mô hình chạy vừa vặn trên 1 GPU duy nhất thay vì cần 2 GPU.

---

## 1. Nút Thắt Của Các Kernel Cũ (GPTQ / AWQ)
- Trọng số được lưu ở dạng nén 4-bit trong HBM.
- Khi nhân ma trận, GPU phải giải nén (dequantize) về FP16 trong Shared Memory / Register trước khi đưa vào Tensor Core.
- Các kernel cũ thường bị giới hạn bởi tốc độ giải nén và không tận dụng hết băng thông HBM.

---

## 2. Kiến Trúc Marlin: Tiến Gần 4x Speedup Lý Thuyết

Marlin tổ chức lại cách sắp xếp dữ liệu (Weight Layout) và sử dụng cơ chế Asynchronous Memory Copy:

\`\`\`mermaid
graph TD
    HBM[(HBM: Packed 4-bit Weights)] -->|Global Memory Pipeline| SMEM[Shared Memory: Dual Buffering]
    SMEM -->|Register Transform| REG[Registers: Fast Bit-unpacking]
    REG -->|Tensor Core MMA Instructions| TC[Ampere / Hopper Tensor Cores]
    TC --> Result[FP16 Accumulated Result]
\`\`\`

---

## 3. Trạng Thái Hiện Tại
> 📌 **Ghi chú tiến độ**: Chương này đang trong giai đoạn dịch và tổng hợp tài liệu thực nghiệm benchmark trên cụm A100 SXM4.
