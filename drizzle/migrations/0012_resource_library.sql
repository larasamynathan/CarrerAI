ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'Beginner';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS estimated_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE public.resources ADD CONSTRAINT resources_difficulty_check CHECK (difficulty IN ('Beginner','Intermediate','Advanced'));
CREATE UNIQUE INDEX IF NOT EXISTS resources_title_category_key ON public.resources(category, title);

CREATE TABLE public.resource_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
GRANT SELECT, INSERT, DELETE ON public.resource_progress TO authenticated;
GRANT ALL ON public.resource_progress TO service_role;
ALTER TABLE public.resource_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own resource progress" ON public.resource_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO public.resources (category, title, description, url, resource_type, difficulty, estimated_minutes, source_name) VALUES
('DSA','Arrays & two-pointer patterns','Practice traversing arrays with two indices to solve pair-sum, reversal and partition problems in linear time.','https://visualgo.net/en/sorting','Practice','Beginner',45,'VisuAlgo (NUS)'),
('DSA','Linked lists, stacks and queues','Build each structure from scratch, then trace insert, delete and reverse operations step by step.','https://visualgo.net/en/list','Guide','Beginner',60,'VisuAlgo (NUS)'),
('DSA','Trees, graphs and traversals','Learn BFS, DFS and binary-tree traversals, and when each one fits a shortest-path or search problem.','https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/','Course','Intermediate',120,'MIT OpenCourseWare'),
('DSA','Dynamic programming foundations','Identify overlapping subproblems, write a recurrence, then convert it to memoized and tabulated solutions.','https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/','Course','Advanced',150,'MIT OpenCourseWare'),
('Java','Java language basics','Variables, control flow, methods and classes — the syntax every Java coding round assumes you know.','https://dev.java/learn/','Guide','Beginner',90,'dev.java (Oracle)'),
('Java','Collections framework','Compare ArrayList, LinkedList, HashMap, TreeMap and HashSet by complexity and typical interview use.','https://docs.oracle.com/javase/tutorial/collections/','Documentation','Intermediate',60,'Oracle Java Tutorials'),
('Java','Concurrency essentials','Threads, synchronization, executors and common pitfalls such as race conditions and deadlocks.','https://docs.oracle.com/javase/tutorial/essential/concurrency/','Documentation','Advanced',90,'Oracle Java Tutorials'),
('Python','Python tutorial','The official walkthrough of data types, functions, modules and classes for writing clean interview code.','https://docs.python.org/3/tutorial/','Documentation','Beginner',90,'Python Software Foundation'),
('Python','Built-in data structures','Lists, dicts, sets, tuples and collections helpers like deque and Counter for fast problem solving.','https://docs.python.org/3/tutorial/datastructures.html','Documentation','Intermediate',45,'Python Software Foundation'),
('SQL','SQL fundamentals','SELECT, WHERE, ORDER BY and aggregate functions practised on a sample database.','https://www.postgresql.org/docs/current/tutorial-sql.html','Documentation','Beginner',60,'PostgreSQL Documentation'),
('SQL','Joins and grouping','Inner, left and self joins plus GROUP BY / HAVING — the core of most SQL interview questions.','https://www.postgresql.org/docs/current/tutorial-join.html','Documentation','Intermediate',45,'PostgreSQL Documentation'),
('SQL','Window functions','Ranking, running totals and partitioned calculations with OVER(), a frequent advanced SQL question.','https://www.postgresql.org/docs/current/tutorial-window.html','Documentation','Advanced',45,'PostgreSQL Documentation'),
('DBMS','Normalization and keys','Understand primary, foreign and candidate keys, and how 1NF–BCNF remove redundancy.','https://ocw.mit.edu/search/?q=database','Course','Beginner',60,'MIT OpenCourseWare'),
('DBMS','Transactions, ACID and isolation','How databases keep data correct under concurrency: isolation levels, locking and MVCC.','https://www.postgresql.org/docs/current/transaction-iso.html','Documentation','Intermediate',45,'PostgreSQL Documentation'),
('DBMS','Indexes and query plans','How B-tree indexes speed lookups and how to read a query plan to find slow operations.','https://www.postgresql.org/docs/current/indexes.html','Documentation','Advanced',60,'PostgreSQL Documentation'),
('OS','Processes, threads and scheduling','Process states, context switching and scheduling algorithms such as FCFS, SJF and Round Robin.','https://pages.cs.wisc.edu/~remzi/OSTEP/','Book','Beginner',90,'OSTEP (free textbook, Arpaci-Dusseau)'),
('OS','Memory management and paging','Virtual memory, page tables, TLBs and page-replacement policies explained with examples.','https://pages.cs.wisc.edu/~remzi/OSTEP/','Book','Intermediate',90,'OSTEP (free textbook, Arpaci-Dusseau)'),
('OS','Concurrency, locks and deadlocks','Mutexes, semaphores, condition variables and the four conditions that cause deadlock.','https://pages.cs.wisc.edu/~remzi/OSTEP/','Book','Advanced',90,'OSTEP (free textbook, Arpaci-Dusseau)'),
('Computer Networks','OSI and TCP/IP models','What each layer does and which protocols live there — a standard opening networks question.','https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work','Guide','Beginner',30,'MDN Web Docs'),
('Computer Networks','HTTP, DNS and what happens when you type a URL','Trace a request from DNS lookup through TCP/TLS handshake to the HTTP response.','https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview','Documentation','Intermediate',45,'MDN Web Docs'),
('Computer Networks','TCP vs UDP and congestion control','Reliability, flow control, the three-way handshake and when UDP is the better choice.','https://book.systemsapproach.org/','Book','Advanced',75,'Computer Networks: A Systems Approach (open book)'),
('OOP','Four pillars of OOP','Encapsulation, abstraction, inheritance and polymorphism with small code examples of each.','https://dev.java/learn/oop/','Guide','Beginner',45,'dev.java (Oracle)'),
('OOP','Interfaces vs abstract classes','When to choose each, plus composition over inheritance — a common follow-up question.','https://docs.oracle.com/javase/tutorial/java/IandI/','Documentation','Intermediate',40,'Oracle Java Tutorials'),
('OOP','SOLID and design patterns','Apply SOLID principles and recognise Singleton, Factory, Strategy and Observer in interview designs.','https://refactoring.guru/design-patterns','Guide','Advanced',90,'Refactoring.Guru'),
('Aptitude','Percentages, ratios and averages','Shortcut methods for the quantitative questions that appear in almost every placement test.','https://www.khanacademy.org/math/pre-algebra','Course','Beginner',60,'Khan Academy'),
('Aptitude','Time, speed, work and probability','Set up equations quickly for work-rate, relative-speed and basic probability problems.','https://www.khanacademy.org/math/statistics-probability','Course','Intermediate',75,'Khan Academy'),
('Aptitude','Logical reasoning practice','Practise series, coding-decoding, blood relations and seating arrangements under time pressure.','/assessment','Practice','Intermediate',30,'CareerAI assessments'),
('Technical Interview','How to approach a coding interview','Clarify, give a brute-force idea, optimise, code, then test aloud — a repeatable structure.','https://techdevguide.withgoogle.com/','Guide','Beginner',30,'Google Tech Dev Guide'),
('Technical Interview','System design basics','Load balancers, caching, databases and scaling trade-offs for entry-level design rounds.','https://github.com/donnemartin/system-design-primer','Guide','Advanced',120,'System Design Primer (open source)'),
('Technical Interview','Timed technical mock interview','Practise explaining your solutions aloud with AI feedback on clarity and correctness.','/mock-interview?type=Technical','Practice','Intermediate',30,'CareerAI mock interviews'),
('HR Interview','Answering with the STAR method','Structure behavioural answers as Situation, Task, Action, Result with a concrete outcome.','https://www.indeed.com/career-advice/interviewing/how-to-use-the-star-interview-response-technique','Article','Beginner',20,'Indeed Career Guide'),
('HR Interview','Tell me about yourself & why this company','Build a 60-second introduction linking your projects to the role, and research the company first.','/coach','Practice','Beginner',25,'CareerAI coach'),
('HR Interview','HR mock interview','Practise strengths, weaknesses, conflict and career-goal questions with AI feedback.','/mock-interview?type=HR','Practice','Intermediate',30,'CareerAI mock interviews'),
('Resume','Writing impact-focused bullet points','Start with an action verb, describe what you built and quantify the result where you can.','https://www.indeed.com/career-advice/resumes-cover-letters/resume-action-words','Article','Beginner',30,'Indeed Career Guide'),
('Resume','One-page fresher resume structure','Order sections as education, skills, projects, experience and achievements, with no clutter.','/resume','Practice','Beginner',30,'CareerAI resume analyzer'),
('Resume','ATS-friendly formatting and keywords','Use simple layouts and match genuine skills to the job description so automated screens read it correctly.','/resume','Practice','Intermediate',30,'CareerAI resume analyzer')
ON CONFLICT DO NOTHING;