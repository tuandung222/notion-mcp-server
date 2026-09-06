---
title: "Tổng Quan Kiến Trúc LLM Serving Hiện Đại"
order: 1
tags: ["Architecture", "LLM", "Serving"]
status: "Đã hoàn thành"
---

# Tổng Quan Kiến Trúc LLM Serving Hiện Đại

LLM Serving là bài toán cân bằng giữa **độ trễ (Latency - TTFT/ITL)** và **thông lượng (Throughput - tokens/sec)**. Khác với các web service truyền thống, LLM Inference là một tác vụ bị giới hạn nghiêm trọng bởi **băng thông bộ nhớ (Memory Bandwidth Bound)** ở giai đoạn Decode và **sức mạnh tính toán (Compute Bound)** ở giai đoạn Prefill.

---

## 1. Hai Pha Cơ Bản Của LLM Inference

1. **Pha Prefill (Context Phase)**:
   - Xử lý toàn bộ prompt đầu vào một lần.
   - Tính toán ma trận lớn ($N \times D$), tận dụng tối đa Tensor Cores.
   - Compute-bound.
2. **Pha Decode (Generation Phase)**:
   - Sinh từng token một cách tuần tự (autoregressive).
   - Mỗi token mới yêu cầu đọc toàn bộ KV Cache cũ từ HBM vào SRAM.
   - Memory-bandwidth bound.

---

## 2. Luồng Xử Lý Request (Request Lifecycle)

\`\`\`mermaid
graph TD
    User([Client Request]) --> Router[Load Balancer / Gateway]
    Router --> Engine[LLM Engine: vLLM / TensorRT-LLM]
    
    subgraph Scheduler [Continuous Batching Scheduler]
        Engine --> BatchQueue[Waiting Queue]
        BatchQueue --> RunningBatch[Running Batch: Prefill + Decode]
    end
    
    subgraph Execution [GPU Worker Execution]
        RunningBatch --> KVMem[KV Cache Paged Memory]
        RunningBatch --> Kernels[Marlin / FlashAttention Kernels]
    end
    
    Execution --> Output([Stream Tokens to Client])
\`\`\`

---

## 3. Các Thách Thức Cốt Lõi
- **KV Cache Bloat**: Với context dài (32k - 128k), dung lượng bộ nhớ dành cho KV Cache vượt xa trọng số mô hình.
- **Fragmentation**: Cấp phát bộ nhớ liên tục gây lãng phí tới 60-80% VRAM.
- **Dequantization Overhead**: Nén trọng số 4-bit giúp tiết kiệm VRAM nhưng tốn chi phí giải nén nếu kernel không tối ưu.
