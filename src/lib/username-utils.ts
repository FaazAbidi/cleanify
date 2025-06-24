import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a clean username from a full name
 * @param fullName - The user's full name
 * @returns A clean, URL-safe username
 */
export const generateUsernameFromName = (fullName: string): string => {
  // Remove extra spaces and convert to lowercase
  const cleanName = fullName.trim().toLowerCase();
  
  // Replace spaces with underscores and remove special characters
  let baseUsername = cleanName
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20); // Limit length
  
  // Ensure it doesn't start with underscore or number
  if (/^[_0-9]/.test(baseUsername)) {
    baseUsername = 'user_' + baseUsername;
  }
  
  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = baseUsername + '_user';
  }
  
  return baseUsername;
};

/**
 * Checks if a username is available in the database
 * @param username - The username to check
 * @returns Promise<boolean> - true if available, false if taken
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which means username is available
    console.error('Error checking username availability:', error);
    throw error;
  }
  
  // If no data found, username is available
  return !data;
};

/**
 * Generates a unique username by checking availability and adding numbers if needed
 * @param fullName - The user's full name
 * @returns Promise<string> - A unique username
 */
export const generateUniqueUsername = async (fullName: string): Promise<string> => {
  const baseUsername = generateUsernameFromName(fullName);
  let username = baseUsername;
  let counter = 1;
  
  while (counter <= 9999) {
    const isAvailable = await isUsernameAvailable(username);
    
    if (isAvailable) {
      return username;
    }
    
    // Username exists, try with number suffix
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  // If all attempts failed, use timestamp
  return `${baseUsername}_${Date.now().toString().slice(-4)}`;
};

/**
 * Updates an existing profile record with fullname and username
 * @param userId - The user's ID from Supabase auth
 * @param fullName - The user's full name
 * @param username - The generated username
 * @returns Promise<void>
 */
export const updateUserProfile = async (
  userId: string, 
  fullName: string, 
  username: string
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      username: username,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  
  console.log('User profile updated successfully:', { userId, fullName, username });
}; 