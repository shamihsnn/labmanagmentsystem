// Mock API service for authentication
// In a real application, this would make actual API calls to a backend server

// Simulated user database
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: 2,
    username: 'labadmin',
    password: 'lab123',
    name: 'Lab Admin User',
    role: 'lab-admin'
  }
];

// Simulated JWT creation
const generateToken = (user) => {
  // In a real app, use a library like jsonwebtoken to create a real JWT
  return `mock-jwt-token-${user.id}-${user.role}-${Date.now()}`;
};

export const login = async (username, password) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    throw new Error('Invalid username or password');
  }

  const token = generateToken(user);

  // Don't include the password in the returned user object
  const { password: _, ...userWithoutPassword } = user;
  
  return {
    token,
    user: userWithoutPassword
  };
};

export const verifyToken = async (token) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In a real app, this would verify the token with the backend
  if (!token || !token.startsWith('mock-jwt-token-')) {
    throw new Error('Invalid token');
  }
  
  return true;
};

// In a real application, add additional auth methods like register, refreshToken, etc. 