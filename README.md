# Apex Booking Backend

A comprehensive multi-platform calendar booking integration service built with Node.js and TypeScript. This backend service provides a unified interface for managing calendar bookings and appointments across multiple scheduling platforms including GoHighLevel (GHL), Calendly, and OnceHub.

## Features

- **Multi-Platform Calendar Integration**
  - GoHighLevel (GHL) calendar synchronization
  - Calendly integration
  - OnceHub integration
  - Unified API for cross-platform booking management

- **Authentication & Security**
  - Secure authentication for multiple platforms
  - OAuth2 implementation
  - JWT-based API security
  - Platform-specific token management

- **Advanced Booking Management**
  - Real-time availability checking
  - Cross-platform calendar synchronization
  - Webhook support for real-time updates
  - UTM parameter tracking for marketing analytics

- **Additional Features**
  - Style configuration management
  - Comprehensive logging system
  - Automated tasks via cron jobs
  - Supabase database integration

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd apex-booking-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Configure your `.env` file with the necessary credentials

## Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```plaintext
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# GoHighLevel Configuration
GHL_API_KEY=your_ghl_api_key
GHL_BASE_URL=your_ghl_base_url

# Calendly Configuration
CALENDLY_CLIENT_ID=your_calendly_client_id
CALENDLY_CLIENT_SECRET=your_calendly_client_secret
CALENDLY_REDIRECT_URI=your_calendly_redirect_uri

# OnceHub Configuration
ONCEHUB_API_KEY=your_oncehub_api_key
ONCEHUB_BASE_URL=your_oncehub_base_url

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Project Structure

```
src/
├── server.ts              # Application entry point
├── constants/            # Application constants
├── controllers/          # Request handlers
│   ├── calendly/        # Calendly-specific controllers
│   └── onceHub/         # OnceHub-specific controllers
├── cron/                # Scheduled tasks
├── routes/              # API route definitions
├── services/            # External service integrations
├── types/               # TypeScript type definitions
└── utils/               # Utility functions and helpers
    └── calendar/        # Calendar-specific utilities
```

## Technologies Used

- **Core Stack**
  - Node.js
  - TypeScript
  - Express.js

- **Database**
  - Supabase

- **Libraries & Tools**
  - JWT for authentication
  - Axios for HTTP requests
  - node-cron for scheduled tasks
  - Winston for logging

## Third-Party APIs

### GoHighLevel (GHL)
- **Purpose**: Primary calendar and booking management
- **Integration**: REST API
- **Key Files**: 
  - `src/controllers/ghlController.ts`
  - `src/utils/calendar/ghlCalendar.ts`
- **Required Configuration**:
  - GHL_API_KEY
  - GHL_BASE_URL

### Calendly
- **Purpose**: Calendar integration and appointment scheduling
- **Integration**: OAuth2 + REST API
- **Key Files**:
  - `src/controllers/calendly/authController.ts`
  - `src/controllers/calendly/controller.ts`
  - `src/utils/calendar/calendlyCalendar.ts`
- **Required Configuration**:
  - CALENDLY_CLIENT_ID
  - CALENDLY_CLIENT_SECRET
  - CALENDLY_REDIRECT_URI

### OnceHub
- **Purpose**: Additional scheduling platform integration
- **Integration**: REST API
- **Key Files**:
  - `src/controllers/onceHub/authController.ts`
  - `src/controllers/onceHub/controller.ts`
  - `src/utils/calendar/onceHubCalendar.ts`
- **Required Configuration**:
  - ONCEHUB_API_KEY
  - ONCEHUB_BASE_URL

### Supabase
- **Purpose**: Database and user management
- **Integration**: Supabase client library
- **Key Files**: `src/services/supabaseClient.ts`
- **Required Configuration**:
  - SUPABASE_URL
  - SUPABASE_KEY

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For additional support or questions, please open an issue in the repository.
