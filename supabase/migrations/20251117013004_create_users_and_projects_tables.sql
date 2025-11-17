/*
  # Create Users and Projects Tables with Row-Level Security

  ## Overview
  This migration creates two core tables for user management and project ownership,
  with comprehensive Row-Level Security (RLS) policies to ensure data isolation
  and proper access control.

  ## New Tables

  ### 1. `users` Table
  - `id` (uuid, primary key) - Unique identifier for each user
  - `email` (text, unique, not null) - User's email address
  - `role` (text, not null) - User role (e.g., 'admin', 'user', 'member')
  - `created_at` (timestamptz, default now()) - Timestamp of user creation

  ### 2. `projects` Table
  - `id` (uuid, primary key) - Unique identifier for each project
  - `owner_id` (uuid, foreign key to users.id) - References the user who owns this project
  - `title` (text, not null) - Project title/name
  - `created_at` (timestamptz, default now()) - Timestamp of project creation

  ## Security Implementation

  ### Users Table RLS Policies
  1. **Users can view their own profile** - SELECT policy allowing users to read their own data
  2. **Users can update their own profile** - UPDATE policy allowing users to modify their own data
  3. **Users can insert their own profile** - INSERT policy during user registration
  4. **Admins can view all users** - SELECT policy for users with 'admin' role

  ### Projects Table RLS Policies
  1. **Users can view their own projects** - SELECT policy where owner_id matches auth.uid()
  2. **Users can create projects** - INSERT policy allowing authenticated users to create projects
  3. **Users can update their own projects** - UPDATE policy where owner_id matches auth.uid()
  4. **Users can delete their own projects** - DELETE policy where owner_id matches auth.uid()

  ## Important Notes
  - All tables have RLS enabled by default for maximum security
  - Foreign key constraint ensures referential integrity between projects and users
  - Default values are set for timestamps and UUIDs for convenience
  - Policies are restrictive by default - users can only access their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR USERS TABLE
-- =====================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES FOR PROJECTS TABLE
-- =====================================================

-- Policy: Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policy: Users can create projects (automatically set as owner)
CREATE POLICY "Users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on users.email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on users.role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index on projects.owner_id for faster owner lookups
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Index on projects.created_at for sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
