import { NotionService } from "../src/client/notion-client.js";
import { markdownToNotionBlocks } from "../src/converters/markdown-parser.js";
import { delay } from "../src/client/rate-limiter.js";

const PARENT_PAGE_ID = "3d312a7a-9435-8121-ab65-d7b183650b7d";

// 1. All 24 Lectures / Sessions data
const LECTURES_DATA = [
  {
    lecture: "01 — Course Overview & Foundations of Self-Improvement",
    date: "Mon Sep 22, 2025",
    track: "Foundations",
    speaker: "Aakanksha Chowdhery & Azalia Mirhoseini",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Giới thiệu tổng quan về khóa học CS329A: các phương pháp tự cải thiện của AI Agents qua tương tác với chính mình và môi trường. Lộ trình từ test-time compute scaling, verifiers, RL, tool use, memory đến autonomous robotics.",
    readings: []
  },
  {
    lecture: "02 — Test-Time Compute Scaling",
    date: "Fri Sep 26, 2025",
    track: "Test-Time Compute",
    speaker: "Aakanksha Chowdhery",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Nghiên cứu cơ chế scale inference compute: Repeated sampling (Large Language Monkeys), optimal allocation test-time vs pre-training compute, và framework tìm kiếm kiến trúc suy luận Archon.",
    readings: [
      "Large Language Monkeys: Scaling Inference Compute with Repeated Sampling (Brown et al. 2024)",
      "Archon: An Architecture Search Framework for Inference-Time Techniques (Saad-Falcon et al. 2024)",
      "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters (Snell et al. 2024)",
      "How Do Large Language Monkeys Get Their Power (Laws)?"
    ]
  },
  {
    lecture: "03 — Robust Verification & Process Supervision",
    date: "Mon Sep 29, 2025",
    track: "Verification & PRM",
    speaker: "Azalia Mirhoseini",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Xây dựng các bộ kiểm chứng (Verifiers) tin cậy cho reasoning. So sánh Process Reward Models (PRM, Let's Verify step by step) vs Outcome Reward Models (ORM), thu hẹp khoảng cách sinh - kiểm chứng (Generation-Verification Gap) với weak verifiers và Math-Shepherd.",
    readings: [
      "Shrinking the Generation-Verification Gap with Weak Verifiers",
      "Training Verifiers to Solve Math Word Problems (Cobbe et al. 2021)",
      "Let's Verify step by step (Lightman et al. 2023)",
      "Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations (Wang et al. 2023)"
    ]
  },
  {
    lecture: "04 — Learning from Feedback with Tools & Code",
    date: "Fri Oct 3, 2025",
    track: "Feedback & Tool-Use",
    speaker: "Aakanksha Chowdhery",
    status: "Completed",
    deadlines: "Homework 1 out (due Oct 13)",
    slides: "https://cs329a.stanford.edu",
    summary: "Tích hợp vòng lặp phản hồi từ môi trường ngoài: Phối hợp suy luận và hành động (ReAct), học củng cố từ kết quả thực thi code (RLEF), và tự giám sát đạo đức/an toàn bằng Constitutional AI (RLAIF).",
    readings: [
      "ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al. 2022)",
      "RLEF: Grounding Code LLMs in Execution Feedback with Reinforcement Learning",
      "Constitutional AI: Harmlessness from AI Feedback"
    ]
  },
  {
    lecture: "05 — Multi-Step Reasoning, Planning & Tree Search",
    date: "Mon Oct 6, 2025",
    track: "Planning & Search",
    speaker: "Azalia Mirhoseini",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Thuật toán tìm kiếm đường đi suy luận: Language Agent Tree Search (LATS) kết hợp MCTS với LLM, SPRINT xử lý planning đan xen thực thi song song, ADaPT phân rã bài toán linh hoạt, và so sánh tìm kiếm rộng vs sâu (Wider or Deeper).",
    readings: [
      "SWiRL: Synthetic Data Generation & Multi-Step RL for Reasoning & Tool Use",
      "Language Agent Tree Search Unifies Reasoning Acting and Planning in Language Models (Zhou et al. 2023)",
      "SPRINT: Enabling Interleaved Planning and Parallelized Execution in Reasoning Models",
      "ADaPT: As-Needed Decomposition and Planning with Language Models (Prasad et al. 2024)",
      "Wider or Deeper? Scaling LLM Inference-Time Compute with Adaptive Branching Tree Search"
    ]
  },
  {
    lecture: "06 — Train Time Scaling & Reinforcement Learning",
    date: "Fri Oct 10, 2025",
    track: "Train-Time RL",
    speaker: "Aakanksha Chowdhery",
    status: "Completed",
    deadlines: "Project Proposal due",
    slides: "https://cs329a.stanford.edu",
    summary: "Mở rộng năng lực mô hình trong pha huấn luyện: Tự nâng cấp suy luận với STaR (Self-Taught Reasoner), kỹ thuật DeepSeekMath, và hạ tầng mã nguồn mở RL quy mô lớn DAPO.",
    readings: [
      "STaR: Bootstrapping Reasoning With Reasoning (Zelikman et al. 2022)",
      "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models",
      "DAPO: An Open-Source LLM Reinforcement Learning System at Scale"
    ]
  },
  {
    lecture: "07 — Open-Ended Evolution of Self-Improving Agents",
    date: "Mon Oct 13, 2025",
    track: "Open-Ended Evolution",
    speaker: "Azalia Mirhoseini",
    status: "Completed",
    deadlines: "Homework 2 out on Oct 14 (due Oct 22)",
    slides: "https://cs329a.stanford.edu",
    summary: "Thiết kế hệ thống agent tự động tiến hóa: Tự động thiết kế kiến trúc agentic, The AI Scientist tự động nghiên cứu khoa học end-to-end, và AlphaEvolve dùng Gemini tự tối ưu thuật toán lập trình.",
    readings: [
      "Automated design of agentic systems",
      "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery (Lu et al. 2024)",
      "AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms"
    ]
  },
  {
    lecture: "08 — Self-Improvement with Search & Deep Research Agents",
    date: "Fri Oct 17, 2025",
    track: "Coding & Systems",
    speaker: "Aakanksha Chowdhery",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Agentic Search kết hợp suy luận chuyên sâu: Từ thi đấu lập trình đỉnh cao với AlphaCode / AlphaCode 2 đến Search-o1 mở rộng khả năng tìm kiếm thông tin có cấu trúc.",
    readings: [
      "Competition-Level Code Generation with AlphaCode",
      "AlphaCode 2 Technical Report",
      "Search-o1: Agentic Search-Enhanced Large Reasoning Models"
    ]
  },
  {
    lecture: "09 — Guest Lecture: Melvin Johnson (Google DeepMind)",
    date: "Mon Oct 20, 2025",
    track: "Guest Lecture",
    speaker: "Melvin Johnson (Google DeepMind)",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Bài giảng đặc biệt: 'Evolution of Post-training from Chatbots to Agents' — Hành trình chuyển đổi kỹ thuật post-training từ trợ lý hội thoại thụ động sang hệ thống tác tử chủ động giải quyết bài toán phức tạp.",
    readings: [
      "Evolution of Post-training from Chatbots to Agents"
    ]
  },
  {
    lecture: "10 — Midterm Presentations (Session 1)",
    date: "Fri Oct 24, 2025",
    track: "Milestone",
    speaker: "Student Presentations",
    status: "Completed",
    deadlines: "Homework 3 out (due Nov 7)",
    slides: "https://cs329a.stanford.edu",
    summary: "Các nhóm sinh viên báo cáo tiến độ đồ án nghiên cứu (5-10 phút thuyết trình kèm Q&A và nhận xét từ giảng viên).",
    readings: []
  },
  {
    lecture: "11 — Midterm Presentations (Session 2)",
    date: "Mon Oct 27, 2025",
    track: "Milestone",
    speaker: "Student Presentations",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Tiếp tục phiên báo cáo đồ án giữa kỳ của sinh viên CS329A.",
    readings: []
  },
  {
    lecture: "12 — Midterm Presentations (Session 3)",
    date: "Fri Oct 31, 2025",
    track: "Milestone",
    speaker: "Student Presentations",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Phiên báo cáo cuối cùng của giai đoạn Midterm Milestone.",
    readings: []
  },
  {
    lecture: "13 — Agentic Frameworks for Software Engineering",
    date: "Mon Nov 3, 2025",
    track: "Coding & Systems",
    speaker: "Azalia Mirhoseini",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Ứng dụng tác tử AI trong kỹ nghệ phần mềm: CodeMonkeys scale compute cho SWE-bench, đánh giá khả năng viết GPU kernel với KernelBench, và tối ưu hiệu năng chương trình song song.",
    readings: [
      "CodeMonkeys: Scaling Test-Time Compute for Software Engineering",
      "KernelBench: Can LLMs Write Efficient GPU Kernels?",
      "Improving Parallel Program Performance with LLM Optimizers via Agent-System Interfaces"
    ]
  },
  {
    lecture: "14 — Augmenting Agents with Memory (Guest: Junchen Jiang)",
    date: "Fri Nov 7, 2025",
    track: "Memory & Context",
    speaker: "Junchen Jiang (LMCache, UChicago)",
    status: "Completed",
    deadlines: "Homework 3 due",
    slides: "https://cs329a.stanford.edu",
    summary: "Hệ thống bộ nhớ cho AI Agents: Cartridges nén ngữ cảnh dài, MemGPT phân tầng bộ nhớ như hệ điều hành, và CacheBlend phục vụ RAG tốc độ cao với cached knowledge fusion.",
    readings: [
      "Cartridges: Lightweight and general-purpose long context representations via self-study",
      "MemGPT: Towards LLMs as Operating Systems (Packer et al, 2023)",
      "CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion"
    ]
  },
  {
    lecture: "15 — Guest Lecture: Denny Zhou (Google DeepMind)",
    date: "Mon Nov 10, 2025",
    track: "Guest Lecture",
    speaker: "Denny Zhou (Google DeepMind)",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Bài giảng đặc biệt: 'LLM Reasoning' — Đào sâu vào bản chất suy luận từng bước, chuỗi tư duy (Chain-of-Thought), và các kỹ thuật kích thích khả năng lập luận toán học / logic tiên tiến.",
    readings: [
      "LLM Reasoning"
    ]
  },
  {
    lecture: "16 — Guest Lecture: Thang Luong (Google DeepMind)",
    date: "Fri Nov 14, 2025",
    track: "Guest Lecture",
    speaker: "Thang Luong (Google DeepMind)",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Bài giảng đặc biệt: 'Towards AI Superhuman Reasoning: AlphaProof, AlphaGeometry & Gemini IMO Gold Medal' — Khám phá kiến trúc đưa AI đạt trình độ huy chương vàng Olympic Toán quốc tế.",
    readings: [
      "Towards AI Superhuman Reasoning: AlphaProof, AlphaGeometry & Gemini IMO Gold Medal"
    ]
  },
  {
    lecture: "17 — Agentic Evaluations & Long-Horizon Tasks",
    date: "Mon Nov 17, 2025",
    track: "Evaluation & Benchmarks",
    speaker: "Aakanksha Chowdhery",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Thách thức đo lường năng lực tác tử thực hiện tác vụ dài hơi: Benchmark đo khả năng làm việc nhiều giờ liên tục, GDPVal đánh giá tác vụ có giá trị kinh tế thực tế, và DeepScholar-Bench tổng hợp nghiên cứu.",
    readings: [
      "Measuring AI Ability to Complete Long Tasks",
      "GDPVal: Evaluating AI Model Performance on Real-World Economically Valuable Tasks",
      "DeepScholar-Bench: A Live Benchmark and Automated Evaluation for Generative Research Synthesis"
    ]
  },
  {
    lecture: "18 — Guest Lecture: Misha Laskin (Reflection AI)",
    date: "Fri Nov 21, 2025",
    track: "Guest Lecture",
    speaker: "Misha Laskin (Reflection AI)",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Bài giảng đặc biệt: 'Building Agentic Systems for Autonomy: Lessons & Open questions' — Kinh nghiệm thực chiến và bài học đúc kết khi triển khai hệ thống tác tử tự chủ trong thực tế.",
    readings: [
      "Building Agentic Systems for Autonomy: Lessons & Open questions"
    ]
  },
  {
    lecture: "— — Thanksgiving Holiday Break",
    date: "Mon Nov 24 & Fri Nov 28, 2025",
    track: "Milestone",
    speaker: "N/A",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Kỳ nghỉ Lễ Tạ Ơn (Thanksgiving). Sinh viên tập trung hoàn thiện thí nghiệm đồ án cuối kỳ.",
    readings: []
  },
  {
    lecture: "19 — Guest Lecture: Danny Driess (Physical Intelligence)",
    date: "Mon Dec 1, 2025",
    track: "Guest Lecture",
    speaker: "Danny Driess (Physical Intelligence)",
    status: "Completed",
    deadlines: "None",
    slides: "https://cs329a.stanford.edu",
    summary: "Bài giảng đặc biệt: 'Multimodal AI Agents in Robotics' — Ứng dụng tác tử đa phương thức (Vision-Language-Action Models) trong điều khiển robot và tương tác với thế giới vật lý.",
    readings: [
      "Multimodal AI Agents in Robotics"
    ]
  },
  {
    lecture: "20 — Future Research Areas & Course Wrap-up",
    date: "Fri Dec 5, 2025",
    track: "Foundations",
    speaker: "Aakanksha Chowdhery & Azalia Mirhoseini",
    status: "Completed",
    deadlines: "Final project preparation",
    slides: "https://cs329a.stanford.edu",
    summary: "Tổng kết khóa học CS329A: Điểm lại các bước đột phá, các vấn đề mở chưa có lời giải và các hướng nghiên cứu tiềm năng trong tương lai của Self-Improving AI Agents.",
    readings: []
  },
  {
    lecture: "— — Final Project Due",
    date: "Wed Dec 10, 2025",
    track: "Milestone",
    speaker: "Course Staff",
    status: "Completed",
    deadlines: "Final project due (EoD)",
    slides: "https://cs329a.stanford.edu",
    summary: "Hạn chót nộp toàn bộ báo cáo đồ án nghiên cứu cuối kỳ (Report + Code Repo). Không áp dụng late days.",
    readings: []
  },
  {
    lecture: "— — Final Project Poster Presentation",
    date: "Fri Dec 12, 2025",
    track: "Milestone",
    speaker: "All Students & Staff",
    status: "Completed",
    deadlines: "Poster session in Skilling Auditorium",
    slides: "https://cs329a.stanford.edu",
    summary: "Buổi triển lãm poster và thuyết trình trực tiếp toàn bộ các công trình nghiên cứu đồ án của sinh viên CS329A Autumn 2025.",
    readings: []
  }
];

// 2. All 34 Research Papers data
const PAPERS_DATA = [
  {
    title: "Large Language Monkeys: Scaling Inference Compute with Repeated Sampling",
    authors: "Brown et al. 2024",
    topic: "Inference Scaling",
    url: "https://arxiv.org/abs/2407.21787",
    lecture: "Lecture 2",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "Archon: An Architecture Search Framework for Inference-Time Techniques",
    authors: "Saad-Falcon et al. 2024",
    topic: "Inference Scaling",
    url: "https://www.arxiv.org/abs/2409.15254",
    lecture: "Lecture 2",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters",
    authors: "Snell et al. 2024",
    topic: "Inference Scaling",
    url: "https://arxiv.org/abs/2408.03314",
    lecture: "Lecture 2",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "How Do Large Language Monkeys Get Their Power (Laws)?",
    authors: "Research Preprint 2025",
    topic: "Inference Scaling",
    url: "https://arxiv.org/abs/2502.17578",
    lecture: "Lecture 2",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Shrinking the Generation-Verification Gap with Weak Verifiers",
    authors: "Research Preprint 2025",
    topic: "Verification & PRM",
    url: "https://arxiv.org/abs/2506.18203",
    lecture: "Lecture 3",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Training Verifiers to Solve Math Word Problems",
    authors: "Cobbe et al. 2021 (OpenAI)",
    topic: "Verification & PRM",
    url: "https://arxiv.org/abs/2110.14168",
    lecture: "Lecture 3",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "Let's Verify step by step",
    authors: "Lightman et al. 2023 (OpenAI)",
    topic: "Verification & PRM",
    url: "https://arxiv.org/abs/2305.20050",
    lecture: "Lecture 3",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations",
    authors: "Wang et al. 2023",
    topic: "Verification & PRM",
    url: "https://arxiv.org/abs/2312.08935",
    lecture: "Lecture 3",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    authors: "Yao et al. 2022 (Princeton / Google Brain)",
    topic: "Tool Use & Feedback",
    url: "https://arxiv.org/abs/2210.03629",
    lecture: "Lecture 4",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "RLEF: Grounding Code LLMs in Execution Feedback with Reinforcement Learning",
    authors: "Research Preprint 2024",
    topic: "Tool Use & Feedback",
    url: "https://arxiv.org/abs/2410.02089",
    lecture: "Lecture 4",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Constitutional AI: Harmlessness from AI Feedback",
    authors: "Bai et al. 2022 (Anthropic)",
    topic: "Tool Use & Feedback",
    url: "https://arxiv.org/abs/2212.08073",
    lecture: "Lecture 4",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "SWiRL: Synthetic Data Generation & Multi-Step RL for Reasoning & Tool Use",
    authors: "Research Preprint 2025",
    topic: "Planning & Search",
    url: "https://arxiv.org/abs/2504.04736",
    lecture: "Lecture 5",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Language Agent Tree Search Unifies Reasoning Acting and Planning in Language Models (LATS)",
    authors: "Zhou et al. 2023 (UIUC / MIT / Princeton)",
    topic: "Planning & Search",
    url: "https://arxiv.org/abs/2310.04406",
    lecture: "Lecture 5",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "SPRINT: Enabling Interleaved Planning and Parallelized Execution in Reasoning Models",
    authors: "Research Preprint 2025",
    topic: "Planning & Search",
    url: "https://arxiv.org/abs/2506.05745",
    lecture: "Lecture 5",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "ADaPT: As-Needed Decomposition and Planning with Language Models",
    authors: "Prasad et al. 2024 (UNC Chapel Hill)",
    topic: "Planning & Search",
    url: "https://arxiv.org/abs/2311.05772",
    lecture: "Lecture 5",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Wider or Deeper? Scaling LLM Inference-Time Compute with Adaptive Branching Tree Search",
    authors: "Research Preprint 2025",
    topic: "Planning & Search",
    url: "https://arxiv.org/abs/2503.04412",
    lecture: "Lecture 5",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "STaR: Bootstrapping Reasoning With Reasoning",
    authors: "Zelikman et al. 2022 (Stanford)",
    topic: "Train-Time RL",
    url: "https://arxiv.org/pdf/2203.14465",
    lecture: "Lecture 6",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models",
    authors: "DeepSeek-AI 2024",
    topic: "Train-Time RL",
    url: "https://arxiv.org/abs/2402.03300",
    lecture: "Lecture 6",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "DAPO: An Open-Source LLM Reinforcement Learning System at Scale",
    authors: "Research Preprint 2025",
    topic: "Train-Time RL",
    url: "https://arxiv.org/abs/2503.14476",
    lecture: "Lecture 6",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Automated design of agentic systems",
    authors: "Research Preprint 2025",
    topic: "Open-Ended Evolution",
    url: "https://arxiv.org/pdf/2505.22954",
    lecture: "Lecture 7",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery",
    authors: "Lu et al. 2024 (Sakana AI / Oxford / UBC)",
    topic: "Open-Ended Evolution",
    url: "https://arxiv.org/abs/2408.06292",
    lecture: "Lecture 7",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms",
    authors: "Google DeepMind 2024",
    topic: "Open-Ended Evolution",
    url: "https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf",
    lecture: "Lecture 7",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "Competition-Level Code Generation with AlphaCode",
    authors: "Li et al. 2022 (DeepMind)",
    topic: "Coding Agents",
    url: "https://arxiv.org/pdf/2203.07814",
    lecture: "Lecture 8",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "AlphaCode 2 Technical Report",
    authors: "Google DeepMind 2023",
    topic: "Coding Agents",
    url: "https://storage.googleapis.com/deepmind-media/AlphaCode2/AlphaCode2_Tech_Report.pdf",
    lecture: "Lecture 8",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "Search-o1: Agentic Search-Enhanced Large Reasoning Models",
    authors: "Research Preprint 2025",
    topic: "Coding Agents",
    url: "https://arxiv.org/pdf/2501.05366",
    lecture: "Lecture 8",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "CodeMonkeys: Scaling Test-Time Compute for Software Engineering",
    authors: "Research Preprint 2025",
    topic: "Coding Agents",
    url: "https://arxiv.org/abs/2501.14723",
    lecture: "Lecture 13",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "KernelBench: Can LLMs Write Efficient GPU Kernels?",
    authors: "Stanford University 2025",
    topic: "Coding Agents",
    url: "https://arxiv.org/pdf/2502.10517",
    lecture: "Lecture 13",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "Improving Parallel Program Performance with LLM Optimizers via Agent-System Interfaces",
    authors: "Research Preprint 2024",
    topic: "Coding Agents",
    url: "https://arxiv.org/abs/2410.15625",
    lecture: "Lecture 13",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Cartridges: Lightweight and general-purpose long context representations via self-study",
    authors: "Research Preprint 2025",
    topic: "Memory Systems",
    url: "https://arxiv.org/abs/2506.06266",
    lecture: "Lecture 14",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "MemGPT: Towards LLMs as Operating Systems",
    authors: "Packer et al. 2023 (UC Berkeley)",
    topic: "Memory Systems",
    url: "https://arxiv.org/abs/2310.08560",
    lecture: "Lecture 14",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: true
  },
  {
    title: "CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion",
    authors: "Research Preprint 2024 (LMCache / UChicago)",
    topic: "Memory Systems",
    url: "http://arxiv.org/abs/2405.16444",
    lecture: "Lecture 14",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "Measuring AI Ability to Complete Long Tasks",
    authors: "Research Preprint 2025",
    topic: "Benchmarks & Evaluation",
    url: "https://arxiv.org/abs/2503.14499",
    lecture: "Lecture 17",
    tier: "⭐⭐⭐ Core Foundational",
    status: "Read / Analyzed",
    hasDeepDive: false
  },
  {
    title: "GDPVal: Evaluating AI Model Performance on Real-World Economically Valuable Tasks",
    authors: "Research Preprint 2025",
    topic: "Benchmarks & Evaluation",
    url: "https://arxiv.org/abs/2510.04374",
    lecture: "Lecture 17",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  },
  {
    title: "DeepScholar-Bench: A Live Benchmark and Automated Evaluation for Generative Research Synthesis",
    authors: "Research Preprint 2025",
    topic: "Benchmarks & Evaluation",
    url: "https://arxiv.org/abs/2508.20033",
    lecture: "Lecture 17",
    tier: "⭐⭐ Recommended",
    status: "To Read",
    hasDeepDive: false
  }
];

// 3. Deliverables and Grading data
const DELIVERABLES_DATA = [
  {
    title: "Homework 1: Basics of Self-Improvement & Verifiers",
    weight: 15,
    releaseDate: "Oct 3, 2025",
    dueDate: "Oct 13, 2025",
    status: "Graded",
    lateDays: "Tối đa 2 ngày",
    description: "Xây dựng trực giác cơ bản về self-improvement, triển khai verifiers và test-time scaling bằng repeated sampling."
  },
  {
    title: "Project Proposal: Research Problem & Methodology",
    weight: 2.5,
    releaseDate: "Sep 22, 2025",
    dueDate: "Oct 10, 2025",
    status: "Graded",
    lateDays: "Tối đa 2 ngày",
    description: "Đề xuất đề tài nghiên cứu theo nhóm 2-4 sinh viên, xác định bài toán agentic workflow, baseline và phân bổ API credits."
  },
  {
    title: "Homework 2: Tool Use & Execution Feedback (RL)",
    weight: 15,
    releaseDate: "Oct 14, 2025",
    dueDate: "Oct 22, 2025",
    status: "Graded",
    lateDays: "Tối đa 2 ngày",
    description: "Triển khai ReAct agent tương tác môi trường code execution và huấn luyện reinforcement learning từ execution feedback."
  },
  {
    title: "Midterm Presentation & Milestone Report",
    weight: 10,
    releaseDate: "Oct 10, 2025",
    dueDate: "Oct 24, 27, 31, 2025",
    status: "Graded",
    lateDays: "Tối đa 2 ngày (báo cáo viết)",
    description: "Thuyết trình 5-10 phút trên lớp Skilling Auditorium và nộp báo cáo kết quả sơ bộ đạt được giữa kỳ."
  },
  {
    title: "Homework 3: Multi-Step Reasoning & Tree Search Planning",
    weight: 20,
    releaseDate: "Oct 24, 2025",
    dueDate: "Nov 7, 2025",
    status: "Graded",
    lateDays: "Tối đa 2 ngày",
    description: "Xây dựng thuật toán Language Agent Tree Search (LATS) hoặc adaptive branching tree search giải quyết complex reasoning."
  },
  {
    title: "Final Research Project Report",
    weight: 35,
    releaseDate: "Oct 10, 2025",
    dueDate: "Wed Dec 10, 2025 (EoD)",
    status: "Graded",
    lateDays: "KHÔNG ĐƯỢC PHÉP DÙNG LATE DAYS",
    description: "Báo cáo nghiên cứu khoa học hoàn chỉnh định dạng hội nghị (NeurIPS/ICLR), nộp kèm source code repo có thể reproduce."
  },
  {
    title: "Final Poster Presentation",
    weight: 2.5,
    releaseDate: "Dec 1, 2025",
    dueDate: "Fri Dec 12, 2025",
    status: "Graded",
    lateDays: "Trực tiếp tại Skilling Auditorium",
    description: "Triển lãm poster nghiên cứu khoa học, demo sản phẩm và trả lời phản biện trước toàn bộ giảng viên, CAs và khách mời."
  }
];

// Helper: Markdown content for Paper Deep Dives
function getPaperDeepDiveMarkdown(p: any): string {
  if (p.title.includes("Large Language Monkeys")) {
    return `
# Phân Tích Chuyên Sâu: Large Language Monkeys (Brown et al. 2024)

> 💡 **TL;DR**: Mở rộng inference compute bằng kỹ thuật Repeated Sampling (lấy nhiều mẫu độc lập) vượt trội hơn việc chỉ scale model parameters trên các bài toán reasoning và coding.

---

## 1. Bài Toán & Giới Hạn Của Phương Pháp Cũ
- Trước đây, cộng đồng AI tập trung chủ yếu vào **Train-time Scaling Laws** (tăng tham số mô hình hoặc tăng số token pre-training).
- Tuy nhiên, chi phí huấn luyện ngày càng đắt đỏ. Đối với các bài toán khó (SWE-bench, Codeforces, GSM8K), một mô hình 70B nếu chỉ lấy 1 sample ($k=1$) thường xuyên thất bại.
- **Câu hỏi cốt lõi**: *Nếu ta cho một mô hình nhỏ lấy hàng trăm, hàng nghìn sample ($k=100 \dots 10,000$), liệu năng lực giải quyết bài toán có vượt qua một mô hình lớn gấp 10 lần?*

---

## 2. Kiến Trúc & Cơ Chế Hoạt Động (Architecture)

\`\`\`mermaid
flowchart TD
    Input[Problem Prompt / Specification] --> Sampler[High-Temperature Sampling Engine]
    Sampler --> S1[Sample 1]
    Sampler --> S2[Sample 2]
    Sampler --> S3[Sample ...]
    Sampler --> Sk[Sample k: Up to Thousands]
    
    subgraph Verification [Verification & Filtering Layer]
        S1 & S2 & S3 & Sk --> UnitTests[Unit Tests / Verifier / PRM]
        UnitTests --> PassCheck{Passed Verifier?}
        PassCheck -->|Yes: Solution Found| Success([Output Correct Solution])
        PassCheck -->|No: Discard| Fail([Discard Candidate])
    end
\`\`\`

---

## 3. Các Phát Hiện Thực Nghiệm Chính (Key Findings)
1. **Coverage vs Pass@k**: Với số lượng sample $k$ đủ lớn, xác suất xuất hiện ít nhất một lời giải đúng (coverage) tăng đột biến theo hàm mũ.
2. **Trade-off Đáng Kinh Ngạc**: Một mô hình 8B với $k=1,000$ có thể đạt accuracy tương đương hoặc cao hơn mô hình 70B với $k=1$, trong khi chi phí serving linh hoạt hơn.
3. **Vai Trò Của Verifier**: Khi $k$ lớn, nút thắt chuyển dịch từ *Generation* sang *Verification* (Làm sao tìm được viên ngọc giữa hàng ngàn đáp án rác).

---

## 4. Ý Nghĩa Đối Với Stanford CS329A
- Đặt nền móng cho toàn bộ khái niệm **Test-Time Compute Scaling**.
- Trực tiếp dẫn tới các kỹ thuật tiếp theo: Verifiers (Lecture 3) và Tree Search (Lecture 5).
`;
  }

  if (p.title.includes("Let's Verify step by step")) {
    return `
# Phân Tích Chuyên Sâu: Let's Verify step by step (Lightman et al. 2023)

> 💡 **TL;DR**: OpenAI chứng minh Process Reward Models (PRM - chấm điểm từng bước suy luận) giải quyết triệt để vấn đề ảo giác và gian lận suy luận tốt hơn rất nhiều so với Outcome Reward Models (ORM - chỉ chấm đúng/sai kết quả cuối).

---

## 1. Bài Toán & Giới Hạn Của ORM
- **Outcome Supervision (ORM)**: Chỉ thưởng điểm khi kết quả cuối cùng đúng.
- **Hệ quả tiêu cực**: Mô hình học được các lối tắt nguy hiểm (false reasoning leading to accidental right answer). Trong các bài toán nhiều bước, mô hình có thể tính sai ở bước 2 nhưng vô tình ra kết quả đúng ở bước 5, ORM vẫn thưởng điểm, làm mô hình học ảo giác.

---

## 2. Mô Hình Process Supervision (PRM Architecture)

\`\`\`mermaid
flowchart TD
    Prompt[Math / Reasoning Problem] --> Step1[Step 1: Parse variables]
    Step1 --> PRM1{PRM Check 1: +1}
    PRM1 -->|Valid| Step2[Step 2: Apply formula]
    Step2 --> PRM2{PRM Check 2: +1}
    PRM2 -->|Valid| Step3[Step 3: Arithmetic calculation]
    Step3 --> PRM3{PRM Check 3: -1 Error!}
    PRM3 -->|Hallucination Detected| Prune([Prune Search Branch & Backtrack])
\`\`\`

---

## 3. Đóng Góp Nổi Bật & Bộ Dữ Liệu PRM800K
- Công bố tập dữ liệu **PRM800K**: 800,000 nhãn step-level được người thẩm định gán nhãn cho các bài toán MATH.
- PRM giúp thuật toán **Best-of-N Search** đạt tỷ lệ giải chính xác 78.2% trên tập MATH benchmark, vượt xa ORM.
- Khả năng **credit assignment** chính xác: Biết chính xác bước nào sinh lỗi để cắt nhánh (early pruning).
`;
  }

  if (p.title.includes("ReAct: Synergizing Reasoning")) {
    return `
# Phân Tích Chuyên Sâu: ReAct: Synergizing Reasoning and Acting (Yao et al. 2022)

> 💡 **TL;DR**: Kết hợp đan xen giữa Chuỗi Tư Duy (Reasoning / Thought) và Tương Tác Hành Động (Action / Observation) giúp AI Agent cập nhật kế hoạch theo thời gian thực và giảm thiểu ảo giác.

---

## 1. So Sánh Các Mô Thức Cũ vs ReAct

\`\`\`mermaid
graph TD
    subgraph ActOnly [Act-Only Pattern]
        A1[Question] --> A2[Action: Search]
        A2 --> A3[Observation]
        A3 --> A4[Action: Lookup]
        A4 -->|Mất phương hướng, lặp vô tận| A5[Fail]
    end

    subgraph ReasonOnly [Reason-Only / CoT Pattern]
        C1[Question] --> C2[Thought 1]
        C2 --> C3[Thought 2: Ảo giác tri thức nội tại]
        C3 --> C4[Wrong Answer]
    end

    subgraph ReActPattern [ReAct: Synergizing Both]
        R1[Question] --> R2[Thought: Cần tìm ai?]
        R2 --> R3[Action: Search Engine]
        R3 --> R4[Observation: Kết quả thực tế]
        R4 --> R5[Thought: Tổng hợp và tra cứu tiếp]
        R5 --> R6[Final Answer: Chính xác tuyệt đối]
    end
\`\`\`

---

## 2. Vòng Lặp Chuẩn ReAct (Execution Loop)
1. **Thought**: Tự độc thoại nội tâm (self-reflection) để lập kế hoạch hoặc suy diễn.
2. **Action**: Gọi công cụ (API, Search, Calculator, Python REPL, Shell).
3. **Observation**: Nhận kết quả trả về từ môi trường để làm cơ sở cho Thought tiếp theo.
`;
  }

  if (p.title.includes("Language Agent Tree Search")) {
    return `
# Phân Tích Chuyên Sâu: Language Agent Tree Search - LATS (Zhou et al. 2023)

> 💡 **TL;DR**: Hợp nhất Reasoning, Acting và Planning thành một cây tìm kiếm Monte Carlo Tree Search (MCTS) toàn diện, biến LLM đồng thời thành Agent, Value Function và Reflection Evaluator.

---

## 1. Kiến Trúc 4 Pha MCTS của LATS

\`\`\`mermaid
flowchart LR
    S[1. Selection] --> E[2. Expansion]
    E --> R[3. Evaluation & Reflection]
    R --> B[4. Backpropagation]
    
    subgraph TreeOps [Hoạt Động Cây Tìm Kiếm]
        S -.->|UCB Score| Node[Chọn node tiềm năng]
        E -.->|Sample Actions| Children[Mở rộng các nhánh hành động]
        R -.->|Self-Reflection| Val[Chấm điểm giá trị nhánh]
        B -.->|Update Trajectory| S
    end
\`\`\`

---

## 2. Điểm Đột Phá So Với Tree of Thoughts (ToT)
- ToT chỉ áp dụng cho reasoning thuần túy (không có hành động với môi trường ngoài).
- LATS cho phép node trong cây là các cặp **(Action, Observation)** thực tế.
- Khả năng **External Feedback + Semantic Reflection**: Khi một nhánh dẫn tới lỗi, agent viết lời tự nhận xét (self-reflection) và lưu vào bộ nhớ ngữ cảnh để các lượt tìm kiếm sau không lặp lại sai lầm.
`;
  }

  // Generic clean analysis for other papers
  return `
# Phân Tích Bài Báo: ${p.title}

> 📚 **Thuộc chuyên đề**: ${p.topic} | **Tác giả**: ${p.authors}  
> 🔗 **Đường dẫn chính thức**: [Xem bài báo gốc](${p.url})

---

## 1. Tóm Tắt Ý Tưởng Cốt Lõi (Abstract & Core Insight)
Bài báo nghiên cứu sâu về các phương diện tối ưu hóa và tự cải thiện của AI Agents trong chuyên đề **${p.topic}**. Trọng tâm là cách thức mô hình tương tác với dữ liệu, công cụ hoặc phản hồi từ môi trường để liên tục nâng cao hiệu năng suy luận.

---

## 2. Kiến Trúc Đề Xuất (System Architecture)

\`\`\`mermaid
graph LR
    Input[Problem Context] --> Agent[AI Agent Model]
    Agent --> Exec[Action / Execution]
    Exec --> Feedback[Feedback & Reward Signal]
    Feedback --> Improve[Self-Improvement Loop]
    Improve --> Agent
\`\`\`

---

## 3. Ý Nghĩa Thực Tiễn Đối Với Stanford CS329A
- Đóng vai trò là tài liệu nghiên cứu tham khảo quan trọng trong **${p.lecture}**.
- Cung cấp cơ sở lý thuyết và thực nghiệm cho sinh viên khi xây dựng đồ án nghiên cứu cuối kỳ.
`;
}

async function main() {
  console.log("🚀 Bắt đầu khởi tạo Notion Master Workspace cho Stanford CS329A...");
  const notion = new NotionService();

  // 1. Tạo Master Page
  console.log("📄 Đang tạo Master Page: 'Stanford CS329A: Self-Improving AI Agents'...");
  const masterPage = await notion.createPage({
    parentId: PARENT_PAGE_ID,
    parentType: "page_id",
    title: "Stanford CS329A: Self-Improving AI Agents",
    iconEmoji: "🤖",
    initialBlocks: markdownToNotionBlocks(`
# Stanford CS329A: Self-Improving AI Agents

> 🏫 **Stanford University — Autumn 2025**  
> 📍 **Địa điểm**: Skilling Auditorium | **Thời gian**: Thứ 2 & Thứ 6 (4:30 PM - 5:50 PM PT)  
> 👩‍🏫 **Giảng viên**: [GS. Aakanksha Chowdhery](https://www.achowdhery.com/) & [GS. Azalia Mirhoseini](http://azaliamirhoseini.com/)  
> 👨‍💻 **Trợ giảng (CAs)**: [Chelsea Zou](https://bosonphoton.github.io/), [Shree Reddy](https://www.linkedin.com/in/shree-reddy-7221421b2/), [Kaien Yang](https://www.linkedin.com/in/kaienyang/), [Adrian Gamarra Lafuente](https://www.linkedin.com/in/adrian-gamarra/)  
> 🌐 **Website**: [cs329a.stanford.edu](https://cs329a.stanford.edu) | [Past Projects](https://cs329a.stanford.edu/pastprojects.html)

---

## 🌟 Mục Tiêu & Triết Lý Khóa Học
Khóa học bao quát các kỹ thuật và ứng dụng tân tiến nhất của **AI Agents có khả năng tự cải thiện (Self-Improving AI Agents)** thông qua tương tác liên tục với chính mình và môi trường xung quanh:
- **Test-Time Compute Scaling**: Repeated sampling, search phối hợp verifiers, tối ưu hóa phân bổ compute.
- **Verification & Process Supervision**: Process Reward Models (PRM) chấm điểm từng bước, weak verifiers.
- **Tool Use & Feedback Loops**: Học củng cố từ môi trường code (RLEF), Constitutional AI (RLAIF).
- **Multi-Step Reasoning & Tree Search**: Language Agent Tree Search (LATS), MCTS, adaptive branching.
- **Train-Time Scaling & Evolution**: Tự sinh rationale (STaR), open-source RL quy mô lớn, open-ended scientific evolution (AlphaEvolve, The AI Scientist).
- **Agent Systems & Real-World Applications**: Kỹ nghệ phần mềm (CodeMonkeys, KernelBench), bộ nhớ phân tầng (MemGPT, LMCache) và tác tử đa phương thức trong robot tự chủ.

---

## 🗺️ Lộ Trình Khóa Học (Course Roadmap)

\`\`\`mermaid
flowchart LR
    subgraph P1 ["Phase 1: Foundations & Compute"]
        L1[01. Overview] --> L2[02. Test-Time Compute Scaling]
    end
    subgraph P2 ["Phase 2: Verifiers & Feedback"]
        L2 --> L3[03. Robust Verification & PRM]
        L3 --> L4[04. Feedback with Tools & Code]
    end
    subgraph P3 ["Phase 3: Search & RL Scaling"]
        L4 --> L5[05. Multi-Step Reasoning & LATS]
        L5 --> L6[06. Train-Time RL Scaling & DAPO]
    end
    subgraph P4 ["Phase 4: Evolution & SE Agents"]
        L6 --> L7[07. Open-Ended Evolution]
        L7 --> L8[08. Search & Deep Research]
        L8 --> L13[13. SE Agents & KernelBench]
    end
    subgraph P5 ["Phase 5: Memory, Evals & Robotics"]
        L13 --> L14[14. Memory Systems & LMCache]
        L14 --> L17[17. Long-Horizon Evaluations]
        L17 --> L19[19. Multimodal Agents in Robotics]
    end
    P1 ==> P2 ==> P3 ==> P4 ==> P5
\`\`\`

---
`)
  });

  const masterPageId = masterPage.id;
  console.log(`✅ Master Page đã tạo thành công với ID: ${masterPageId}`);

  // 2. Tạo Database 1: Lecture Syllabus & Schedule
  console.log("📅 Đang tạo Database 1: Course Schedule & Lecture Syllabus...");
  const syllabusDb: any = await notion.client.databases.create({
    parent: { type: "page_id", page_id: masterPageId },
    title: [{ type: "text", text: { content: "📅 Lịch Học & Nội Dung Bài Giảng (Lecture Syllabus)" } }],
    is_inline: true,
    properties: {
      Lecture: { title: {} },
      Date: { rich_text: {} },
      Track: {
        select: {
          options: [
            { name: "Foundations", color: "gray" },
            { name: "Test-Time Compute", color: "blue" },
            { name: "Verification & PRM", color: "green" },
            { name: "Feedback & Tool-Use", color: "orange" },
            { name: "Planning & Search", color: "purple" },
            { name: "Train-Time RL", color: "red" },
            { name: "Open-Ended Evolution", color: "pink" },
            { name: "Coding & Systems", color: "yellow" },
            { name: "Memory & Context", color: "brown" },
            { name: "Evaluation & Benchmarks", color: "default" },
            { name: "Guest Lecture", color: "purple" },
            { name: "Milestone", color: "red" }
          ]
        }
      },
      Speaker: { rich_text: {} },
      Status: {
        select: {
          options: [
            { name: "Planned", color: "gray" },
            { name: "In Progress", color: "yellow" },
            { name: "Completed", color: "green" }
          ]
        }
      },
      Deadlines: { rich_text: {} },
      Slides: { url: {} }
    }
  });
  console.log(`✅ Database Syllabus đã tạo với ID: ${syllabusDb.id}`);

  // Đổ 24 dòng dữ liệu vào Syllabus DB
  console.log("⏳ Đang đồng bộ 24 bài giảng vào Database Syllabus...");
  for (const lec of LECTURES_DATA) {
    const lectureContent = `
# ${lec.lecture}

- **Ngày diễn ra**: ${lec.date}
- **Chuyên đề**: ${lec.track}
- **Người trình bày**: ${lec.speaker}
- **Hạn nộp / Deadline**: ${lec.deadlines || "Không có"}
- **Slide bài giảng**: [Tải slide / Tài liệu](${lec.slides})

---

## 🎯 Tóm Tắt Buổi Học (Key Summary)
${lec.summary}

---

## 📑 Tài Liệu Đọc Yêu Cầu (Required & Suggested Readings)
${lec.readings.length > 0 ? lec.readings.map(r => `- 📄 **${r}**`).join("\n") : "_Không có bài đọc bắt buộc cho buổi này._"}

---

## 📝 Khung Ghi Chép Bài Giảng (Lecture Notes & Insights)
> Ghi chú trực tiếp các thảo luận, công thức và takeaway quan trọng từ buổi học tại đây.
`;

    await notion.client.pages.create({
      parent: { database_id: syllabusDb.id },
      properties: {
        Lecture: { title: [{ text: { content: lec.lecture } }] },
        Date: { rich_text: [{ text: { content: lec.date } }] },
        Track: { select: { name: lec.track } },
        Speaker: { rich_text: [{ text: { content: lec.speaker } }] },
        Status: { select: { name: lec.status } },
        Deadlines: { rich_text: [{ text: { content: lec.deadlines } }] },
        Slides: { url: lec.slides }
      },
      children: markdownToNotionBlocks(lectureContent).slice(0, 100)
    });
    await delay(350);
  }
  console.log("✅ Đã thêm đủ 24 bài giảng vào Syllabus Database!");

  // 3. Tạo Database 2: Research Papers Hub
  console.log("📑 Đang tạo Database 2: Research Papers Hub...");
  const papersDb: any = await notion.client.databases.create({
    parent: { type: "page_id", page_id: masterPageId },
    title: [{ type: "text", text: { content: "📑 Kho Bài Báo Khoa Học & Phân Tích (Research Papers Hub)" } }],
    is_inline: true,
    properties: {
      Title: { title: {} },
      Authors: { rich_text: {} },
      Topic: {
        select: {
          options: [
            { name: "Inference Scaling", color: "blue" },
            { name: "Verification & PRM", color: "green" },
            { name: "Tool Use & Feedback", color: "orange" },
            { name: "Planning & Search", color: "purple" },
            { name: "Train-Time RL", color: "red" },
            { name: "Open-Ended Evolution", color: "pink" },
            { name: "Coding Agents", color: "yellow" },
            { name: "Memory Systems", color: "brown" },
            { name: "Benchmarks & Evaluation", color: "gray" }
          ]
        }
      },
      URL: { url: {} },
      Lecture: { rich_text: {} },
      Tier: {
        select: {
          options: [
            { name: "⭐⭐⭐ Core Foundational", color: "purple" },
            { name: "⭐⭐ Recommended", color: "blue" },
            { name: "⭐ Extended Reading", color: "gray" }
          ]
        }
      },
      Status: {
        select: {
          options: [
            { name: "To Read", color: "red" },
            { name: "Reading", color: "yellow" },
            { name: "Read / Analyzed", color: "green" },
            { name: "Bookmarked", color: "blue" }
          ]
        }
      }
    }
  });
  console.log(`✅ Database Research Papers đã tạo với ID: ${papersDb.id}`);

  // Đổ 34 papers vào Papers DB
  console.log("⏳ Đang đồng bộ 34 bài báo khoa học và phân tích chuyên sâu...");
  for (const paper of PAPERS_DATA) {
    const analysisMd = getPaperDeepDiveMarkdown(paper);

    await notion.client.pages.create({
      parent: { database_id: papersDb.id },
      properties: {
        Title: { title: [{ text: { content: paper.title } }] },
        Authors: { rich_text: [{ text: { content: paper.authors } }] },
        Topic: { select: { name: paper.topic } },
        URL: { url: paper.url },
        Lecture: { rich_text: [{ text: { content: paper.lecture } }] },
        Tier: { select: { name: paper.tier } },
        Status: { select: { name: paper.status } }
      },
      children: markdownToNotionBlocks(analysisMd).slice(0, 100)
    });
    await delay(350);
  }
  console.log("✅ Đã thêm đủ 34 bài báo vào Research Papers Database!");

  // 4. Tạo Database 3: Deliverables & Grading
  console.log("🎯 Đang tạo Database 3: Deliverables & Grading...");
  const deliverablesDb: any = await notion.client.databases.create({
    parent: { type: "page_id", page_id: masterPageId },
    title: [{ type: "text", text: { content: "🎯 Bài Tập, Đồ Án & Cột Mốc Đánh Giá (Grading & Deliverables)" } }],
    is_inline: true,
    properties: {
      Deliverable: { title: {} },
      Weight: { number: { format: "percent" } },
      ReleaseDate: { rich_text: {} },
      DueDate: { rich_text: {} },
      Status: {
        select: {
          options: [
            { name: "Not Started", color: "gray" },
            { name: "In Progress", color: "yellow" },
            { name: "Submitted", color: "blue" },
            { name: "Graded", color: "green" }
          ]
        }
      },
      LateDays: { rich_text: {} },
      Description: { rich_text: {} }
    }
  });
  console.log(`✅ Database Deliverables đã tạo với ID: ${deliverablesDb.id}`);

  for (const del of DELIVERABLES_DATA) {
    const delContent = `
# ${del.title} (${del.weight}%)

- **Ngày phát hành**: ${del.releaseDate}
- **Hạn nộp**: ${del.dueDate}
- **Quy định trễ**: ${del.lateDays}
- **Trọng số điểm**: ${del.weight}%

---

## 📌 Hướng Dẫn & Yêu Cầu Chi Tiết
${del.description}

### Tiêu Chuẩn Nộp Bài
1. Nộp đúng hạn qua hệ thống EdStem / Gradescope của khóa học.
2. Nộp mã nguồn sạch, có file README hướng dẫn thiết lập môi trường và tái hiện kết quả (reproducibility).
3. Đính kèm báo cáo phân tích thực nghiệm và các biểu đồ so sánh.
`;

    await notion.client.pages.create({
      parent: { database_id: deliverablesDb.id },
      properties: {
        Deliverable: { title: [{ text: { content: del.title } }] },
        Weight: { number: del.weight / 100 },
        ReleaseDate: { rich_text: [{ text: { content: del.releaseDate } }] },
        DueDate: { rich_text: [{ text: { content: del.dueDate } }] },
        Status: { select: { name: del.status } },
        LateDays: { rich_text: [{ text: { content: del.lateDays } }] },
        Description: { rich_text: [{ text: { content: del.description } }] }
      },
      children: markdownToNotionBlocks(delContent).slice(0, 100)
    });
    await delay(350);
  }
  console.log("✅ Đã thêm đủ 7 cột mốc bài tập vào Deliverables Database!");

  // 5. Tạo Subpage: Past Projects Showcase (Winter 2025)
  console.log("🏆 Đang tạo Subpage: Past Projects Showcase...");
  await notion.createPage({
    parentId: masterPageId,
    parentType: "page_id",
    title: "🏆 Các Đồ Án Xuất Sắc Kỳ Trước (Past Projects Showcase)",
    iconEmoji: "🏆",
    initialBlocks: markdownToNotionBlocks(`
# Các Đồ Án Nghiên Cứu Tiêu Biểu — Stanford CS329A (Winter 2025)

Dưới đây là 5 công trình nghiên cứu nổi bật từ các nhóm sinh viên khóa trước, là nguồn tài liệu tham khảo quý giá cho sinh viên khi lên ý tưởng đồ án:

---

### 1. AppBench: Benchmarking AI-Generated Web Applications
- **Tác giả**: Ethan Hellman, Brendan McLaughlin, Abhinav Lalwani, Belinda Mo
- **Mô tả**: Benchmark toàn diện đầu tiên đánh giá năng lực của AI Agent trong việc tự động sinh ứng dụng web tương tác phức tạp (code logic, styling, UI components, state management).
- 📄 **Tài liệu**: [Xem Báo Cáo Nghiên Cứu (PDF)](https://cs329a.stanford.edu/winter2025projects/appbench.pdf) | [Xem Poster Trưng Bày (PDF)](https://cs329a.stanford.edu/winter2025projects/appbenchposter.pdf)

---

### 2. PRIME: Planning with Reflective Iterative Multi-Agentic Exploration
- **Tác giả**: Chelsea Zou, Samuel Liu, Jui Khankari
- **Mô tả**: Kiến trúc đa tác tử (Multi-agent) kết hợp giữa lập kế hoạch phân rã và khám phá lặp có tự phản tỉnh (reflective iterative exploration) giúp vượt qua bế tắc trong reasoning.
- 📄 **Tài liệu**: [Xem Báo Cáo Nghiên Cứu (PDF)](https://cs329a.stanford.edu/winter2025projects/prime.pdf) | [Xem Poster Trưng Bày (PDF)](https://cs329a.stanford.edu/winter2025projects/primeposter.pdf)

---

### 3. Enhancing Mathematical Reasoning through Distillation, GRPO, and Multi-Agent PRM Reranking
- **Tác giả**: Abhinav Agarwal, Carlo Baronio, Shree Reddy, Shubhra Mishra
- **Mô tả**: Kết hợp Reasoning Distillation với thuật toán tối ưu hóa GRPO (Group Relative Policy Optimization) và cơ chế xếp hạng lại (reranking) bằng Process Reward Models đa tác tử.
- 📄 **Tài liệu**: [Xem Báo Cáo Nghiên Cứu (PDF)](https://cs329a.stanford.edu/winter2025projects/enhancing.pdf) | [Xem Poster Trưng Bày (PDF)](https://cs329a.stanford.edu/winter2025projects/enhancingposter.pdf)

---

### 4. Towards Effective Meta-Agents: Designing Agents that Design Agents
- **Tác giả**: Batu El, Mert Yuksekgonul, James Zou
- **Mô tả**: Hướng nghiên cứu đột phá về Meta-Agents — xây dựng các tác tử AI bậc cao có khả năng tự động thiết kế kiến trúc, prompt, và phân công vai trò cho các sub-agents cấp dưới.
- 📄 **Tài liệu**: [Xem Báo Cáo Nghiên Cứu (PDF)](https://cs329a.stanford.edu/winter2025projects/batu.pdf) | [Xem Poster Trưng Bày (PDF)](https://cs329a.stanford.edu/winter2025projects/batuposter.pdf)

---

### 5. ARCHON Augmented: Planning and Web-Enhanced Components
- **Tác giả**: Megan Mou, Sherry Xie, Emily Zhang, Andrew Park
- **Mô tả**: Mở rộng framework Archon, tích hợp thêm module lập kế hoạch động và khả năng tra cứu thông tin web thời gian thực cho hệ thống inference-time agentic.
- 📄 **Tài liệu**: [Xem Báo Cáo Nghiên Cứu (PDF)](https://cs329a.stanford.edu/winter2025projects/archon.pdf) | [Xem Poster Trưng Bày (PDF)](https://cs329a.stanford.edu/winter2025projects/archonposter.pdf)
`)
  });
  console.log("✅ Đã tạo Subpage Past Projects!");

  // 6. Tạo Subpage: Course Logistics & Policies
  console.log("📜 Đang tạo Subpage: Course Logistics & Policies...");
  await notion.createPage({
    parentId: masterPageId,
    parentType: "page_id",
    title: "📜 Quy Định Khóa Học & Hướng Dẫn Nghiên Cứu (Policies & Logistics)",
    iconEmoji: "📜",
    initialBlocks: markdownToNotionBlocks(`
# Quy Định & Hướng Dẫn Học Tập — Stanford CS329A

---

## 1. Chính Sách Nộp Trễ (Late Policy)
- **4 ngày nộp trễ miễn phạt (Free Late Days)**: Mỗi sinh viên có tổng cộng 4 ngày nộp trễ miễn phạt cho toàn bộ học kỳ Autumn 2025.
- **Tối đa 2 ngày cho mỗi bài tập**: Sinh viên chỉ được dùng tối đa 2 ngày miễn phạt cho mỗi bài tập hoặc cột mốc (Assignments, Project Proposal, Midterm Milestone).
- **Phạt 25% mỗi ngày sau đó**: Nếu nộp quá số ngày miễn phạt, điểm số sẽ bị trừ 25% cho mỗi ngày nộp muộn tiếp theo.
- **Nghiêm cấm dùng Late Days cho Final Project**: Không áp dụng bất kỳ ngày trễ nào cho báo cáo đồ án cuối kỳ (**Final Project Report** nộp vào Dec 10). Mọi bài nộp sau hạn chót đều nhận điểm 0.
- **Không có ngoại lệ**: Quy định được áp dụng đồng nhất cho toàn thể sinh viên.

---

## 2. Chính Sách Dự Thính (Audit Policy)
- Khóa học **KHÔNG** cho phép sinh viên dự thính (No audits are allowed). Mọi sinh viên tham gia lớp học đều phải đăng ký chính thức để lấy điểm hoặc tín chỉ.

---

## 3. Kênh Liên Lạc Với Đội Ngũ Giảng Dạy
- **EdStem**: Kênh thảo luận và hỏi đáp chính thức về kiến thức, bài giảng và bài tập.
- **Office Hours**: Giờ trực tiếp gặp gỡ giảng viên và trợ giảng để thảo luận sâu về hướng nghiên cứu đồ án.
- Vui lòng đọc kỹ tài liệu hướng dẫn và FAQ trước khi gửi câu hỏi chung lên diễn đàn.

---

## 4. Tài Trợ API Credits Cho Đồ Án Nghiên Cứu
- Sinh viên làm việc theo nhóm từ **2 đến 4 người** để thực hiện công trình nghiên cứu gốc.
- Các nhóm sẽ được ban giảng huấn cấp phát **API Credits (OpenAI, Anthropic, Google Cloud/Gemini)** nhằm phục vụ quá trình chạy thí nghiệm, suy luận và huấn luyện tác tử.
`)
  });
  console.log("✅ Đã tạo Subpage Policies & Logistics!");

  console.log("\n🎉🎉🎉 TOÀN BỘ WORKSPACE STANFORD CS329A ĐÃ ĐƯỢC XÂY DỰNG HOÀN TẤT TRÊN NOTION!");
  console.log(`🔗 Link truy cập trực tiếp Master Page: https://app.notion.com/p/${masterPageId.replace(/-/g, "")}`);
}

main().catch((err) => {
  console.error("❌ Lỗi trong quá trình khởi tạo:", err);
  process.exit(1);
});
