import type { RawQuiz } from '../types/quiz';

export const SAMPLE_QUIZ_VI: RawQuiz = {
  id: 'sample-web-js-vi',
  title: 'Lập trình Web & JavaScript Cơ Bản',
  description:
    '8 câu hỏi thực tế về JavaScript, React, CSS và HTTP kèm đoạn code minh họa & giải thích chi tiết.',
  language: 'vi',
  source: 'sample',
  questions: [
    {
      id: 'vi-q1',
      topic: 'JavaScript',
      question:
        'Kết quả hiển thị trên console khi chạy đoạn code JavaScript sau là gì?\n```js\nconsole.log(1 + "2" + 3);\n```',
      options: ['6', '"123"', '"33"', 'NaN'],
      answerIndex: 1,
      explanation:
        'Phép toán được thực hiện từ trái sang phải: `1 + "2"` ép số `1` thành chuỗi thành `"12"`, sau đó `"12" + 3` tiếp tục nối chuỗi thành `"123"`.',
    },
    {
      id: 'vi-q2',
      topic: 'Event Loop',
      question:
        'Thứ tự in ra màn hình của đoạn code bất đồng bộ dưới đây là gì?\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");\n```',
      options: ['A -> B -> C -> D', 'A -> D -> C -> B', 'A -> D -> B -> C', 'A -> C -> D -> B'],
      answerIndex: 1,
      explanation:
        'Code đồng bộ (`A`, `D`) chạy trước trên Call Stack. Sau đó **Microtask Queue** (`Promise.then` -> `C`) luôn được ưu tiên chạy hết trước **Macrotask Queue** (`setTimeout` -> `B`).',
    },
    {
      id: 'vi-q3',
      topic: 'JavaScript',
      question: 'Sự khác biệt chính giữa toán tử `==` và `===` trong JavaScript là gì?',
      options: [
        '`===` chỉ dùng được cho kiểu số, còn `==` dùng cho chuỗi',
        '`==` so sánh cả giá trị lẫn kiểu dữ liệu, `===` thì không',
        '`===` kiểm tra bằng nhau tuyệt đối (cả giá trị và kiểu dữ liệu) mà không tự ép kiểu',
        'Hai toán tử hoạt động hoàn toàn giống nhau trong mọi trường hợp',
      ],
      answerIndex: 2,
      explanation:
        '`===` (strict equality) yêu cầu **cùng kiểu dữ liệu và cùng giá trị**, ví dụ `5 === "5"` là `false`. Còn `==` tự động ép kiểu ngầm (type coercion) nên dễ gây lỗi khó đoán.',
    },
    {
      id: 'vi-q4',
      topic: 'React',
      question:
        'Trong React, vì sao nên truyền prop `key` duy nhất (như `item.id`) thay vì dùng index của mảng khi render danh sách động?',
      options: [
        'Vì nếu không dùng `item.id` thì trình duyệt sẽ báo lỗi cú pháp JS',
        'Giúp React nhận diện đúng phần tử nào thêm, sửa hoặc xóa để tránh giữ nhầm state của component',
        'Vì `key` là một thẻ HTML đặc biệt để trình duyệt tăng tốc tải ảnh',
        'Chỉ để code nhìn gọn hơn, không ảnh hưởng tới hành vi UI',
      ],
      answerIndex: 1,
      explanation:
        'Khi danh sách có thêm/xóa/sắp xếp lại, `key` theo **index** sẽ làm index dịch chuyển khiến React tái sử dụng nhầm state nội bộ (như giá trị input) của phần tử cũ.',
    },
    {
      id: 'vi-q5',
      topic: 'CSS',
      question:
        'Trong CSS Flexbox mặc định (`flex-direction: row`), thuộc tính nào căn giữa các phần tử con theo **trục dọc** (cross axis)?',
      options: [
        '`justify-content: center`',
        '`align-items: center`',
        '`text-align: center`',
        '`place-self: stretch`',
      ],
      answerIndex: 1,
      explanation:
        'Khi `flex-direction` là `row`, trục chính là ngang (`justify-content`) và trục phụ là dọc (`align-items`). Do đó `align-items: center` căn giữa theo chiều dọc.',
    },
    {
      id: 'vi-q6',
      topic: 'HTTP',
      question:
        'Mã trạng thái HTTP nào thường được trả về khi request gửi lên thiếu hoặc sai **token xác thực** (Unauthorized)?',
      options: ['400 Bad Request', '401 Unauthorized', '404 Not Found', '503 Service Unavailable'],
      answerIndex: 1,
      explanation:
        'Mã `401 Unauthorized` cho biết client chưa xác thực hợp lệ (chưa đăng nhập hoặc token hết hạn), khác với `403 Forbidden` là đã xác thực nhưng không đủ quyền.',
    },
    {
      id: 'vi-q7',
      topic: 'Closure',
      question:
        'Đoạn code sau minh họa khái niệm nào và sẽ trả về giá trị bao nhiêu khi gọi `counter()` lần thứ hai?\n```js\nfunction makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst counter = makeCounter();\ncounter();\nconsole.log(counter());\n```',
      options: ['Hoisting — in ra `0`', 'Closure — in ra `2`', 'Recursion — in ra `1`', 'Prototype — in ra `undefined`'],
      answerIndex: 1,
      explanation:
        'Đây là **Closure**: hàm mũi tên bên trong vẫn ghi nhớ và truy cập được biến `count` của `makeCounter()` ngay cả khi `makeCounter` đã chạy xong. Lần 1 tăng lên `1`, lần 2 in ra `2`.',
    },
    {
      id: 'vi-q8',
      topic: 'Git',
      question:
        'Lệnh Git nào dùng để tạo một nhánh mới tên `feat/quiz` và **chuyển ngay sang nhánh đó**?',
      options: [
        '`git branch feat/quiz`',
        '`git switch -c feat/quiz`',
        '`git commit -b feat/quiz`',
        '`git merge feat/quiz`',
      ],
      answerIndex: 1,
      explanation:
        '`git switch -c feat/quiz` (hoặc lệnh cũ `git checkout -b feat/quiz`) vừa tạo nhánh mới vừa chuyển HEAD sang nhánh đó ngay lập tức.',
    },
  ],
};

export const SAMPLE_QUIZ_EN: RawQuiz = {
  id: 'sample-swe-interview-en',
  title: 'Software Engineering & Interview Essentials',
  description:
    '8 crisp technical interview questions in English covering Big-O, SQL, Caching, HTTP, and System Design.',
  language: 'en',
  source: 'sample',
  questions: [
    {
      id: 'en-q1',
      topic: 'Algorithms',
      question: 'What is the average time complexity of looking up a key in a well-sized **Hash Table**?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      answerIndex: 0,
      explanation:
        'A hash function maps keys directly to bucket indices, yielding constant `O(1)` average lookup time when collisions remain low.',
    },
    {
      id: 'en-q2',
      topic: 'HTTP & REST',
      question: 'Which HTTP method is **NOT idempotent** by standard REST semantics?',
      options: ['GET', 'PUT', 'POST', 'DELETE'],
      answerIndex: 2,
      explanation:
        'Calling `POST` multiple times typically creates multiple new resources or triggers repeated side effects, whereas `GET`, `PUT`, and `DELETE` produce the same resource state when repeated.',
    },
    {
      id: 'en-q3',
      topic: 'Databases',
      question: 'In database **ACID** properties, what does the letter **I** (Isolation) guarantee?',
      options: [
        'All records are automatically indexed on disk',
        'Concurrent transactions do not interfere with each other and leave consistent intermediate states hidden',
        'Database backups are stored in an isolated cloud region',
        'Every SQL query runs on a single CPU thread',
      ],
      answerIndex: 1,
      explanation:
        '**Isolation** ensures that parallel transactions execute without corrupting each other’s results, behaving as if run sequentially depending on the isolation level.',
    },
    {
      id: 'en-q4',
      topic: 'Databases',
      question: 'Why can adding too many B-Tree **indexes** to a SQL table slow down write operations?',
      options: [
        'Indexes prevent `SELECT` queries from using RAM',
        'Every `INSERT`, `UPDATE`, or `DELETE` must also update all affected index structures',
        'Indexes convert relational tables into NoSQL documents',
        'B-Tree indexes expire every 60 seconds',
      ],
      answerIndex: 1,
      explanation:
        'While indexes speed up reads dramatically, write queries incur extra disk and CPU overhead because every relevant index must stay synchronized with table data.',
    },
    {
      id: 'en-q5',
      topic: 'Caching',
      question: 'In the **Cache-Aside** (Lazy Loading) pattern, what happens on a cache miss?',
      options: [
        'The cache throws an immediate 500 error',
        'The application reads from the primary database, writes the entry to the cache, and returns the data',
        'The database automatically pushes all rows into the cache on startup',
        'The request is queued until another user warms the cache',
      ],
      answerIndex: 1,
      explanation:
        'In **Cache-Aside**, the app checks the cache first; on a miss, it fetches from the DB, populates the cache with a TTL, and serves the caller.',
    },
    {
      id: 'en-q6',
      topic: 'System Design',
      question: 'Which algorithm is commonly used for **API Rate Limiting** because it allows controlled short bursts while enforcing an average rate?',
      options: ['Bubble Sort', 'Token Bucket', 'Depth-First Search', 'Two-Phase Commit'],
      answerIndex: 1,
      explanation:
        'The **Token Bucket** refills tokens at a steady rate up to a bucket capacity, naturally permitting brief bursts while capping sustained request volume.',
    },
    {
      id: 'en-q7',
      topic: 'Architecture',
      question: 'Which approach improves reliability when two microservices communicate asynchronously for non-urgent tasks like sending emails?',
      options: [
        'Synchronous nested HTTP polling inside the checkout request',
        'Publishing an event to a Message Queue (e.g., RabbitMQ or Kafka) with retry handling',
        'Sharing the same global in-memory array across servers',
        'Disabling error logging to save CPU cycles',
      ],
      answerIndex: 1,
      explanation:
        'Decoupling via a **Message Queue** absorbs traffic spikes, keeps user-facing response times fast, and enables safe retries with dead-letter queues.',
    },
    {
      id: 'en-q8',
      topic: 'Security',
      question: 'What is the safest way to store user passwords in a backend database?',
      options: [
        'Plain text inside an encrypted HTTPS connection',
        'Fast unsalted MD5 hashing',
        'Slow adaptive salted hashing such as Argon2id or bcrypt',
        'Base64 encoding with a reversible key',
      ],
      answerIndex: 2,
      explanation:
        'Adaptive memory-hard algorithms like **Argon2id** or **bcrypt** with unique per-user salts resist rainbow tables and brute-force GPU attacks.',
    },
  ],
};

export const SAMPLE_QUIZZES: RawQuiz[] = [SAMPLE_QUIZ_VI, SAMPLE_QUIZ_EN];
