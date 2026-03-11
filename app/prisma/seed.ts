/**
 * シードデータ: A型事業所基本セット
 *
 * basic-set.md に基づき、デフォルトの6つのタスクテンプレートと
 * 初期事業所・管理者ユーザーを作成する。
 *
 * 実行: npx prisma db seed
 */

import { PrismaClient, CalculationPattern, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // ========================================
  // 1. デフォルト事業所の作成
  // ========================================
  const facility = await prisma.facility.upsert({
    where: { id: "default-facility" },
    update: {},
    create: {
      id: "default-facility",
      name: "サンプルA型事業所",
    },
  });
  console.log(`✅ 事業所: ${facility.name}`);

  // ========================================
  // 2. 管理者ユーザーの作成
  // ========================================
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      id: "default-admin",
      facilityId: facility.id,
      name: "管理者",
      email: "admin@example.com",
      role: Role.ADMIN,
    },
  });
  console.log(`✅ 管理者: ${admin.name} (${admin.email})`);

  // 一般スタッフの作成
  const staff = await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      id: "default-staff",
      facilityId: facility.id,
      name: "サービス管理責任者",
      email: "staff@example.com",
      role: Role.STAFF,
    },
  });
  console.log(`✅ スタッフ: ${staff.name} (${staff.email})`);

  // ========================================
  // 3. A型事業所基本セット - タスクテンプレート
  // ========================================

  const templates = [
    // ━━━━ 【1】受給者証・行政手続き関連 ━━━━

    // ① 支給決定期間
    {
      id: "tpl-shikyuu-kettei",
      facilityId: facility.id,
      name: "支給決定期間",
      category: "行政手続き",
      calculationPattern: CalculationPattern.MONTH_END,
      calculationRules: { unit: "year", value: 1 },
      alertSteps: [
        { weeksBefore: 6, level: "yellow" },
        { weeksBefore: 4, level: "orange" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: ["未対応", "案内済み（提出待ち）", "完了（更新）"],
      isDefault: true,
      sortOrder: 1,
    },

    // ② 利用者負担の適用期間
    {
      id: "tpl-riyousha-futan",
      facilityId: facility.id,
      name: "利用者負担の適用期間",
      category: "行政手続き",
      calculationPattern: CalculationPattern.MONTH_END,
      calculationRules: { unit: "year", value: 1 },
      alertSteps: [
        { weeksBefore: 6, level: "yellow" },
        { weeksBefore: 4, level: "orange" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: ["未対応", "案内済み（提出待ち）", "完了（更新）"],
      isDefault: true,
      sortOrder: 2,
    },

    // ③ 在宅利用期間（対象者のみ）
    {
      id: "tpl-zaitaku-riyou",
      facilityId: facility.id,
      name: "在宅利用期間",
      category: "行政手続き",
      calculationPattern: CalculationPattern.ADD,
      calculationRules: { unit: "month", value: 6 },
      alertSteps: [
        { weeksBefore: 6, level: "yellow" },
        { weeksBefore: 4, level: "orange" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: ["未対応", "案内済み（提出待ち）", "完了（更新）"],
      isDefault: true,
      sortOrder: 3,
    },

    // ④ 障害者手帳の有効期限 / 自立支援医療受給者証
    {
      id: "tpl-shougaisha-techou",
      facilityId: facility.id,
      name: "障害者手帳の有効期限",
      category: "行政手続き",
      calculationPattern: CalculationPattern.MANUAL,
      calculationRules: {},
      alertSteps: [
        { weeksBefore: 6, level: "yellow" },
        { weeksBefore: 4, level: "orange" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: ["未対応", "案内済み（提出待ち）", "完了（更新）"],
      isDefault: true,
      sortOrder: 4,
    },

    // ━━━━ 【2】支援計画・モニタリング関連 ━━━━

    // ⑤ 個別支援計画（本作成・見直し）
    {
      id: "tpl-kobetsu-shien",
      facilityId: facility.id,
      name: "個別支援計画",
      category: "内部書類",
      calculationPattern: CalculationPattern.REPEAT,
      calculationRules: { unit: "month", interval: 6 },
      alertSteps: [
        { weeksBefore: 4, level: "yellow" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: [
        "未対応",
        "面談済み",
        "書類作成済み",
        "署名・押印済み（完了・更新）",
      ],
      isDefault: true,
      sortOrder: 5,
    },

    // ⑥ モニタリング
    {
      id: "tpl-monitoring",
      facilityId: facility.id,
      name: "モニタリング",
      category: "内部書類",
      calculationPattern: CalculationPattern.REPEAT,
      calculationRules: { unit: "month", interval: 6 },
      alertSteps: [
        { weeksBefore: 4, level: "yellow" },
        { weeksBefore: 2, level: "red" },
      ],
      statusFlow: [
        "未対応",
        "面談済み",
        "書類作成済み",
        "署名・押印済み（完了・更新）",
      ],
      isDefault: true,
      sortOrder: 6,
    },
  ];

  for (const tpl of templates) {
    const template = await prisma.taskTemplate.upsert({
      where: { id: tpl.id },
      update: {
        name: tpl.name,
        category: tpl.category,
        calculationPattern: tpl.calculationPattern,
        calculationRules: tpl.calculationRules,
        alertSteps: tpl.alertSteps,
        statusFlow: tpl.statusFlow,
        isDefault: tpl.isDefault,
        sortOrder: tpl.sortOrder,
      },
      create: tpl,
    });
    console.log(`✅ テンプレート: ${template.name} (${template.calculationPattern})`);
  }

  console.log("\n🎉 シードデータの投入が完了しました！");
  console.log(`   事業所: 1件`);
  console.log(`   ユーザー: 2件 (管理者1 + スタッフ1)`);
  console.log(`   タスクテンプレート: ${templates.length}件`);
}

main()
  .catch((e) => {
    console.error("❌ シードエラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
