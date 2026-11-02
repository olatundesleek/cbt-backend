/**
 * Creates the intentionally curated portfolio scenario
 * inside the existing demo dataset.
 *
 * This is NOT a separate seed entry point.
 *
 * demo_seed.js should:
 *
 * import { curateDemoScenario } from "./curate_demo_scenario.js";
 *
 * and call:
 *
 * await curateDemoScenario(prisma);
 */

export async function curateDemoScenario(prisma) {
  /*
  |--------------------------------------------------------------------------
  | Featured accounts
  |--------------------------------------------------------------------------
  */

  const teacher = await prisma.user.findUnique({
    where: { username: 'demo_teacher' },
  });

  const student = await prisma.user.findUnique({
    where: { username: 'demo_student' },
  });

  const featuredClass = await prisma.class.findUnique({
    where: { className: 'SS2 Science' },
  });

  if (!teacher) {
    throw new Error("Featured demo teacher 'demo_teacher' was not created.");
  }

  if (!student) {
    throw new Error("Featured demo student 'demo_student' was not created.");
  }

  if (!featuredClass) {
    throw new Error("Featured demo class 'SS2 Science' was not created.");
  }

  /*
  |--------------------------------------------------------------------------
  | Make the featured relationships explicit
  |--------------------------------------------------------------------------
  */

  await prisma.class.update({
    where: { id: featuredClass.id },
    data: {
      teacherId: teacher.id,
    },
  });

  await prisma.user.update({
    where: { id: student.id },
    data: {
      classId: featuredClass.id,
    },
  });

  const mathematics = await prisma.course.findUnique({
    where: {
      title: 'Mathematics',
    },
  });

  if (!mathematics) {
    throw new Error('Featured Mathematics course was not created.');
  }

  await prisma.course.update({
    where: {
      id: mathematics.id,
    },
    data: {
      teacherId: teacher.id,
      classes: {
        connect: [
          {
            id: featuredClass.id,
          },
        ],
      },
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Featured question bank
  |--------------------------------------------------------------------------
  */

  const bank = await prisma.questionBank.findFirst({
    where: {
      courseId: mathematics.id,
      createdBy: teacher.id,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!bank) {
    throw new Error('Featured Mathematics question bank was not found.');
  }

  const questions = await prisma.question.findMany({
    where: {
      bankId: bank.id,
    },
    orderBy: {
      id: 'asc',
    },
    take: 15,
  });

  if (questions.length < 15) {
    throw new Error(
      `Featured Mathematics question bank needs at least 15 questions. Found ${questions.length}.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Test lifecycle timestamps
  |--------------------------------------------------------------------------
  */

  const now = Date.now();

  // Upcoming: starts tomorrow
  const upcomingStart = new Date(now + 24 * 60 * 60 * 1000);

  const upcomingEnd = new Date(upcomingStart.getTime() + 60 * 60 * 1000);

  // Active: started 30 minutes ago and ends in 90 minutes
  const activeStart = new Date(now - 30 * 60 * 1000);

  const activeEnd = new Date(Date.now() + 23 * 60 * 60 * 1000);

  // Past: ended 3 days ago
  const pastStart = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000);

  /*
  |--------------------------------------------------------------------------
  | Upcoming test
  |--------------------------------------------------------------------------
  */

  const upcomingTest = await prisma.test.upsert({
    where: {
      title: 'Demo Mathematics Mid-Term Examination',
    },

    update: {
      type: 'EXAM',
      testState: 'scheduled',
      showResult: false,
      startTime: upcomingStart,
      endTime: upcomingEnd,
      duration: 60,
      attemptsAllowed: 1,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },

    create: {
      title: 'Demo Mathematics Mid-Term Examination',
      type: 'EXAM',
      testState: 'scheduled',
      showResult: false,
      startTime: upcomingStart,
      endTime: upcomingEnd,
      duration: 60,
      attemptsAllowed: 1,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Active test
  |--------------------------------------------------------------------------
  */

  const activeTest = await prisma.test.upsert({
    where: {
      title: 'Demo Mathematics Algebra Assessment',
    },

    update: {
      type: 'TEST',
      testState: 'active',
      showResult: true,
      startTime: activeStart,
      endTime: activeEnd,
      duration: 45,
      attemptsAllowed: 2,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },

    create: {
      title: 'Demo Mathematics Algebra Assessment',
      type: 'TEST',
      testState: 'active',
      showResult: true,
      startTime: activeStart,
      endTime: activeEnd,
      duration: 45,
      attemptsAllowed: 2,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Past test
  |--------------------------------------------------------------------------
  */

  const pastTest = await prisma.test.upsert({
    where: {
      title: 'Demo Mathematics Revision Test',
    },

    update: {
      type: 'TEST',
      testState: 'completed',
      showResult: true,
      startTime: pastStart,
      endTime: pastEnd,
      duration: 60,
      attemptsAllowed: 3,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },

    create: {
      title: 'Demo Mathematics Revision Test',
      type: 'TEST',
      testState: 'completed',
      showResult: true,
      startTime: pastStart,
      endTime: pastEnd,
      duration: 60,
      attemptsAllowed: 3,
      passMark: 40,
      courseId: mathematics.id,
      bankId: bank.id,
      createdBy: teacher.id,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Remove any previous curated sessions
  |--------------------------------------------------------------------------
  |
  | This makes the result deterministic whenever demo_seed runs.
  */

  const existingPastSessions = await prisma.testSession.findMany({
    where: {
      studentId: student.id,
      testId: pastTest.id,
    },
    select: {
      id: true,
    },
  });

  const existingPastSessionIds = existingPastSessions.map(
    (session) => session.id,
  );

  if (existingPastSessionIds.length > 0) {
    await prisma.answer.deleteMany({
      where: {
        testSessionId: {
          in: existingPastSessionIds,
        },
      },
    });

    await prisma.testSession.deleteMany({
      where: {
        id: {
          in: existingPastSessionIds,
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Create completed student attempt
  |--------------------------------------------------------------------------
  |
  | 15 questions × 4 marks = 60 total
  |
  | 12 correct × 4 = 48
  |
  | Pass mark = 40
  |
  | Therefore the student passes with 48/60.
  */

  const completedSession = await prisma.testSession.create({
    data: {
      studentId: student.id,
      testId: pastTest.id,
      attemptNo: 1,
      status: 'COMPLETED',
      startedAt: pastStart,
      endedAt: pastEnd,
      score: 48,
    },
  });

  const answerData = questions.map((question, index) => {
    const correct = index < 12;

    const options = Array.isArray(question.options) ? question.options : [];

    const incorrectOption = options.find(
      (option) => String(option) !== String(question.answer),
    );

    return {
      testSessionId: completedSession.id,
      questionId: question.id,
      selectedOption: correct
        ? String(question.answer)
        : String(incorrectOption ?? question.answer),
      isCorrect: correct,
    };
  });

  await prisma.answer.createMany({
    data: answerData,
  });

  /*
  |--------------------------------------------------------------------------
  | Keep the active test fresh
  |--------------------------------------------------------------------------
  |
  | The student should see the active test as something
  | they can actually start, rather than an already-started
  | attempt left behind by the previous reset.
  */

  const existingActiveSessions = await prisma.testSession.findMany({
    where: {
      studentId: student.id,
      testId: activeTest.id,
    },
    select: {
      id: true,
    },
  });

  const existingActiveSessionIds = existingActiveSessions.map(
    (session) => session.id,
  );

  if (existingActiveSessionIds.length > 0) {
    await prisma.answer.deleteMany({
      where: {
        testSessionId: {
          in: existingActiveSessionIds,
        },
      },
    });

    await prisma.testSession.deleteMany({
      where: {
        id: {
          in: existingActiveSessionIds,
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Return useful references
  |--------------------------------------------------------------------------
  */

  return {
    teacherId: teacher.id,
    studentId: student.id,
    classId: featuredClass.id,
    courseId: mathematics.id,
    questionBankId: bank.id,
    upcomingTestId: upcomingTest.id,
    activeTestId: activeTest.id,
    pastTestId: pastTest.id,
    completedSessionId: completedSession.id,
    score: 48,
    totalMarks: 60,
    passMark: 40,
  };
}
