# QuizChill — Website Làm Bài Thi Trắc Nghiệm từ JSON

Website làm bài thi trắc nghiệm chạy 100% ở phía trình duyệt (không cần đăng nhập, không cần database):

- **Nhập bộ đề JSON linh hoạt**: Kéo thả/tải file `.json` hoặc dán trực tiếp, tự nhận diện nhiều biến thể JSON, tải file JSON mẫu và tích hợp sẵn 2 bộ đề mẫu (Tiếng Việt có code block & Tiếng Anh).
- **2 chế độ làm bài**:
  - **Luyện tập (kiểu Kahoot)**: Chấm đúng/sai tức thì, hiện giải thích ngay, tính combo streak & điểm tốc độ.
  - **Thi thật (Online Exam)**: Tự do chuyển câu, gắn cờ xem lại, nộp bài mới chấm điểm & xem giải thích, hỗ trợ ôn lại riêng các câu làm sai.
- **Tùy chọn thời gian**: Không giới hạn / Giới hạn từng câu (Kahoot) / Giới hạn tổng thời gian cả bài.
- **Tự động trộn đề**: Trộn thứ tự đáp án A/B/C/D (giữ đúng đáp án chính xác), trộn thứ tự câu hỏi, chọn làm N câu ngẫu nhiên.
- **Nhạc nền Chill & SFX**: 3 vibe tích hợp sẵn bằng Web Audio API (*Lo-fi Piano*, *Warm Ambient*, *Tiếng mưa nhẹ*), hỗ trợ chọn thêm file MP3 cá nhân, tự động giảm âm lượng nhạc nền khi TTS đang đọc.
- **Đọc câu hỏi & đáp án (TTS miễn phí, tương thích Mobile)**: Dùng Web Speech API (`window.speechSynthesis`), tự nhận diện Tiếng Việt / Tiếng Anh, chỉnh tốc độ đọc, đọc câu hỏi + 4 đáp án + giải thích, hỗ trợ lọc ký tự Markdown trước khi đọc.

---

## Cách chạy cục bộ với Bun

```bash
# Cài đặt dependencies
bun install

# Chạy môi trường phát triển
bun run dev

# Chạy unit tests
bun test

# Kiểm tra TypeScript & build static site ra thư mục dist/
bun run build
```

Thư mục `dist/` sau khi build có thể deploy tĩnh lên Vercel, Netlify, Cloudflare Pages hoặc GitHub Pages.

---

## Định dạng file JSON đầu vào

Chuẩn khuyến nghị:

```json
{
  "title": "Tên bộ đề",
  "description": "Mô tả ngắn (tùy chọn)",
  "language": "vi",
  "questions": [
    {
      "topic": "Chủ đề (tùy chọn)",
      "question": "Nội dung câu hỏi (hỗ trợ **in đậm**, `inline code`, và ```code block```)",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "answer": 2,
      "explanation": "Giải thích chi tiết vì sao đáp án đúng"
    }
  ]
}
```

### Các biến thể được tự động hỗ trợ
- Root có thể là mảng câu hỏi trực tiếp `[...]` hoặc object chứa `questions` / `items` / `data` / `quiz`.
- Đáp án (`answer` / `correctAnswer` / `correct` / `correctIndex`) chấp nhận:
  - Chỉ số `0..3` (hoặc tự nhận diện `1..4` nếu cả bộ dùng chỉ số 1-based)
  - Chữ cái `"A"`..`"D"` (không phân biệt hoa/thường, kể cả `"B."`, `"option C"`)
  - Chuỗi khớp chính xác nội dung 1 trong các lựa chọn.
- Danh sách lựa chọn (`options` / `choices` / `answers`) có thể là mảng chuỗi, object `{ "A": "...", "B": "...", "C": "...", "D": "..." }`, hoặc các field rời `optionA`..`optionD`.

---

## Hướng dẫn chọn TTS miễn phí & tương thích tốt trên Mobile

Website sử dụng **Web Speech API (`window.speechSynthesis`)** — tích hợp sẵn trong trình duyệt nên **miễn phí 100%, không cần API key, không cần server**, hoạt động ngay cả khi offline:
- **iOS (Safari / Chrome trên iOS)**: Dùng giọng hệ thống (như *Linh* cho Tiếng Việt, *Samantha* cho Tiếng Anh). Nếu thiết bị chưa nghe rõ, vào *Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt* để tải giọng chất lượng cao và kiểm tra nút gạt im lặng (Silent switch).
- **Android (Chrome / Edge / Samsung Internet)**: Dùng Google Speech Services đọc cả Tiếng Việt và Tiếng Anh mượt mà.
- QuizChill đã xử lý sẵn: mở khóa âm thanh theo thao tác chạm, chia nhỏ câu dài để tránh bị ngắt giữa chừng trên Chrome/Safari, lọc bớt cú pháp Markdown khi đọc, và tự hạ nhỏ nhạc nền (audio ducking) trong lúc đang đọc.
