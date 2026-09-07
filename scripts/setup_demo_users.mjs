#!/usr/bin/env node
/**
 * TutorFlow Demo User Setup Script
 * 
 * Configures existing Supabase Auth users for demonstration:
 * - tutor@gmail.com → Tutor role with profile
 * - student1@gmail.com → Student role with profile, owned by tutor
 * - student2@gmail.com → Student role with profile, owned by tutor
 * 
 * This script uses the service-role key to bypass RLS for setup purposes.
 * It does NOT modify passwords or delete any existing users.
 * 
 * SECURITY: This script must only be run for initial demo setup.
 *           Do NOT use service-role key in production application code.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== TutorFlow Demo User Setup ===\n");

  // Get the auth user IDs for our demo users
  const { data: users, error: usersError } = await admin.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Failed to list users:", usersError.message);
    process.exit(1);
  }

  const userMap = {};
  for (const user of users.users) {
    userMap[user.email] = user;
  }

  const tutorAuth = userMap["tutor@gmail.com"];
  const student1Auth = userMap["student1@gmail.com"];
  const student2Auth = userMap["student2@gmail.com"];

  if (!tutorAuth) {
    console.error("ERROR: tutor@gmail.com not found in Supabase Auth");
    process.exit(1);
  }
  if (!student1Auth) {
    console.error("ERROR: student1@gmail.com not found in Supabase Auth");
    process.exit(1);
  }
  if (!student2Auth) {
    console.error("ERROR: student2@gmail.com not found in Supabase Auth");
    process.exit(1);
  }

  console.log("Found Auth users:");
  console.log(`  - tutor@gmail.com (ID: ${tutorAuth.id})`);
  console.log(`  - student1@gmail.com (ID: ${student1Auth.id})`);
  console.log(`  - student2@gmail.com (ID: ${student2Auth.id})\n`);

  // Create profiles for all three users
  // NOTE: The prevent_role_change() trigger blocks role changes after creation,
  // so we must insert with the correct role from the start.
  
  console.log("Creating profiles...\n");

  // Tutor profile
  const tutorProfile = {
    id: tutorAuth.id,
    role: "tutor",
    full_name: "Demo Tutor",
  };

  const { error: tutorProfileError } = await admin
    .from("profiles")
    .insert(tutorProfile)
    .select()
    .single();

  if (tutorProfileError) {
    console.error("Failed to create tutor profile:", tutorProfileError.message);
    process.exit(1);
  }
  console.log("✓ Created tutor profile for tutor@gmail.com");
  console.log(`  Role: tutor, Name: Demo Tutor\n`);

  // Student 1 profile
  const student1Profile = {
    id: student1Auth.id,
    role: "student",
    full_name: "Student One",
  };

  const { error: student1ProfileError } = await admin
    .from("profiles")
    .insert(student1Profile)
    .select()
    .single();

  if (student1ProfileError) {
    console.error("Failed to create student1 profile:", student1ProfileError.message);
    process.exit(1);
  }
  console.log("✓ Created student profile for student1@gmail.com");
  console.log(`  Role: student, Name: Student One\n`);

  // Student 2 profile
  const student2Profile = {
    id: student2Auth.id,
    role: "student",
    full_name: "Student Two",
  };

  const { error: student2ProfileError } = await admin
    .from("profiles")
    .insert(student2Profile)
    .select()
    .single();

  if (student2ProfileError) {
    console.error("Failed to create student2 profile:", student2ProfileError.message);
    process.exit(1);
  }
  console.log("✓ Created student profile for student2@gmail.com");
  console.log(`  Role: student, Name: Student Two\n`);

  // Create student domain records
  // Both students belong to tutor@gmail.com according to TutorFlow ownership model
  // The check_tutor_role() trigger ensures tutor_id references a profile with role='tutor'
  
  console.log("Creating student domain records...\n");

  // Student 1 domain record
  const student1Record = {
    tutor_id: tutorAuth.id,
    user_id: student1Auth.id,
    name: "Student One",
    email: "student1@gmail.com",
    subject: "Mathematics",
  };

  const { data: student1Data, error: student1Error } = await admin
    .from("students")
    .insert(student1Record)
    .select()
    .single();

  if (student1Error) {
    console.error("Failed to create student1 record:", student1Error.message);
    process.exit(1);
  }
  console.log("✓ Created student record for student1@gmail.com");
  console.log(`  Student ID: ${student1Data.id}`);
  console.log(`  Subject: Mathematics`);
  console.log(`  Owned by: tutor@gmail.com (tutor_id: ${tutorAuth.id})\n`);

  // Student 2 domain record
  const student2Record = {
    tutor_id: tutorAuth.id,
    user_id: student2Auth.id,
    name: "Student Two",
    email: "student2@gmail.com",
    subject: "Physics",
  };

  const { data: student2Data, error: student2Error } = await admin
    .from("students")
    .insert(student2Record)
    .select()
    .single();

  if (student2Error) {
    console.error("Failed to create student2 record:", student2Error.message);
    process.exit(1);
  }
  console.log("✓ Created student record for student2@gmail.com");
  console.log(`  Student ID: ${student2Data.id}`);
  console.log(`  Subject: Physics`);
  console.log(`  Owned by: tutor@gmail.com (tutor_id: ${tutorAuth.id})\n`);

  console.log("=== Demo User Setup Complete ===");
  console.log("\nSummary:");
  console.log("  Tutor: tutor@gmail.com (ID: " + tutorAuth.id + ")");
  console.log("  Student 1: student1@gmail.com (ID: " + student1Auth.id + ")");
  console.log("  Student 2: student2@gmail.com (ID: " + student2Auth.id + ")");
  console.log("\nBoth students are owned by tutor@gmail.com according to TutorFlow's ownership model.");
  console.log("RLS policies remain intact - no authorization was weakened.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
