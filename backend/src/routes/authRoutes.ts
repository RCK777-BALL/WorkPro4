import bcrypt from '../lib/bcrypt';
import jwt from '../lib/jwt';
import User from '../models/User';

interface LoginResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleLogin(requestBody: unknown): Promise<LoginResult> {
  try {
    const payload = (requestBody ?? {}) as Record<string, unknown>;
    const emailRaw = payload.email;
    const passwordRaw = payload.password;

    if (!emailRaw || !passwordRaw) {
      return {
        status: 400,
        body: { error: { code: 400, message: 'Email and password required' } },
      };
    }

    const email = String(emailRaw).toLowerCase().trim();
    const password = String(passwordRaw);

    const user = await User.findOne({ email });

    if (!user) {
      return {
        status: 401,
        body: { error: { code: 401, message: 'Invalid credentials' } },
      };
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return {
        status: 401,
        body: { error: { code: 401, message: 'Invalid credentials' } },
      };
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return {
        status: 500,
        body: {
          error: {
            code: 500,
            message: 'Server misconfigured: missing JWT_SECRET',
          },
        },
      };
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      secret,
      { expiresIn: '1d' },
    );

    return {
      status: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name ?? 'Admin',
        },
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error: {
          code: 500,
          message: 'Internal Server Error',
        },
      },
    };
  }
}
