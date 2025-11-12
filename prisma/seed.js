import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("Admin@123", 10);
  const teacherPass = await bcrypt.hash("Teacher@123", 10);
  const studentPass = await bcrypt.hash("Student@123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPass,
      role: "ADMIN",
      firstname: "Olatunde",
      lastname: "Sleek",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { username: "teacher1" },
    update: {},
    create: {
      username: "teacher1",
      password: teacherPass,
      role: "TEACHER",
      firstname: "Mr.",
      lastname: "Johnson",
    },
  });

  const class1 = await prisma.class.upsert({
    where: { className: "SS1" },
    update: {},
    create: {
      className: "SS1",
      teacherId: teacher.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { username: "student1" },
    update: {},
    create: {
      username: "student1",
      password: studentPass,
      role: "STUDENT",
      firstname: "Jane",
      lastname: "Sasha",
      classId: class1.id,
    },
  });

  const course = await prisma.course.upsert({
    where: { title: "Mathematics" },
    update: {},
    create: {
      title: "Mathematics",
      description: "Basic Algebra and Geometry",
      teacherId: teacher.id,
      classes: {
        connect: [{ id: class1.id }],
      },
    },
  });

  //  FIXED HERE
  const bank = await prisma.questionBank.upsert({
    where: { questionBankName: "Math Question Bank" },
    update: {},
    create: {
      questionBankName: "Math Question Bank",
      description: "Bank for Algebra and Geometry questions",
      createdBy: teacher.id,
      courseId: course.id, //  use courseId instead of course.connect
    },
  });

  //  FIXED HERE TOO
  const test = await prisma.test.upsert({
    where: { title: "Math Practice Test" },
    update: {},
    create: {
      title: "Math Practice Test",
      type: "TEST",
      testState: "active",
      createdBy: teacher.id,
      courseId: course.id, //  use courseId
      bankId: bank.id, //  use bankId
      passMark: 40,
      duration: 60,
      attemptsAllowed: 3,
    },
  });

  const existingQuestions = await prisma.question.findMany({
    where: { bankId: bank.id },
  });

  if (existingQuestions.length === 0) {
    await prisma.question.createMany({
      data: [
        {
          text: "What is 2 + 2?",
          options: JSON.stringify(["2", "3", "4", "5"]),
          answer: "4",
          marks: 1,
          bankId: bank.id,
        },
        {
          text: "Solve for x: 3x = 9",
          options: JSON.stringify(["1", "2", "3", "4"]),
          answer: "3",
          marks: 1,
          bankId: bank.id,
        },
      ],
    });
  }

  console.log(" Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
