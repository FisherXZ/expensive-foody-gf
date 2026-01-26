'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { UserProfile, UserProfileUpdate } from '@/lib/types/database';

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    // If profile doesn't exist, create one
    if (error.code === 'PGRST116') {
      const insertData = {
        id: user.id,
        email_notifications: true,
        sms_notifications: false,
      };
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert(insertData as never)
        .select()
        .single();

      if (createError) {
        return { data: null, error: createError.message };
      }

      return { data: newProfile as UserProfile, error: null };
    }

    return { data: null, error: error.message };
  }

  return { data: data as UserProfile, error: null };
}

/**
 * Update user profile settings
 */
export async function updateUserProfile(
  updates: UserProfileUpdate
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Ensure profile exists first
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    // Create profile if it doesn't exist
    const insertData = {
      id: user.id,
      ...updates,
    };
    const { error: createError } = await supabase
      .from('user_profiles')
      .insert(insertData as never);

    if (createError) {
      return { success: false, error: createError.message };
    }
  } else {
    // Update existing profile
    const { error } = await supabase
      .from('user_profiles')
      .update(updates as never)
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/settings');
  return { success: true, error: null };
}

/**
 * Get current user email
 */
export async function getCurrentUser(): Promise<{
  email: string | null;
  id: string | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { email: null, id: null, error: error?.message || 'Not authenticated' };
  }

  return { email: user.email || null, id: user.id, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
