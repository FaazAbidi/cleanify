# Cleanify Platform - Advanced Data Preprocessing & Analysis Platform

A comprehensive web-based platform for data preprocessing, analysis, and visualization built for data scientists, analysts, and researchers. This platform provides an intuitive interface for cleaning, transforming, and analyzing datasets with advanced preprocessing capabilities and real-time collaboration features.

## 🎯 Project Overview

Cleanify Platform is a full-stack data preprocessing and analysis platform that transforms messy, raw data into clean, analysis-ready datasets. The platform provides a complete pipeline from data upload to advanced preprocessing, with built-in analytics, version control, and visualization capabilities.

### Key Objectives
- **Data Quality Enhancement**: Automated detection and resolution of data quality issues
- **Preprocessing Automation**: Comprehensive suite of data preprocessing methods
- **Version Control**: Track data transformations and maintain version history
- **Collaborative Analysis**: Multi-user environment with secure data management
- **Visual Analytics**: Interactive dashboards and correlation analysis
- **Scalable Architecture**: Modern tech stack supporting concurrent users

## ✨ Core Features

### 🔧 Data Preprocessing Pipeline
- **Missing Data Handling**
  - Multiple imputation strategies (mean, median, mode, random, removal)
  - Column-specific configuration for categorical and numerical data
  - Real-time missing data detection and statistics

- **Data Cleaning**
  - Outlier detection using IQR and Z-score methods
  - Inconsistency detection and resolution
  - Duplicate data identification and removal
  - Data type validation and correction

- **Data Transformation**
  - Normalization (Min-Max scaling to 0-1 range)
  - Standardization (Z-score transformation)
  - Skewness correction (log, square root, reciprocal transformations)
  - Feature binning with customizable intervals

- **Feature Engineering**
  - One-hot encoding for categorical variables
  - Label encoding with automatic mapping
  - Feature combination and creation
  - Column dropping with dependency analysis

- **Data Reduction**
  - PCA (Principal Component Analysis) for dimensionality reduction
  - Data sampling techniques (random, stratified)
  - High-dimensionality detection and management
  - Multicollinearity analysis and resolution

### 📊 Advanced Analytics & Visualization
- **Correlation Analysis**
  - Interactive correlation heatmaps
  - Feature-to-feature scatter plots
  - Top correlations identification
  - Target-based correlation filtering

- **Pre-Analysis Insights**
  - Automated data quality assessment
  - ML model recommendations based on data characteristics
  - Statistical summaries and distributions
  - Data profiling and metadata extraction

- **Interactive Dashboards**
  - Real-time processing statistics
  - Method usage analytics
  - Performance metrics tracking
  - User activity monitoring

### 🔄 Version Control & Task Management
- **Task-Based Workflow**
  - Project organization by tasks
  - Multiple datasets per task
  - Status tracking (RAW, PROCESSING, PROCESSED, FAILED)

- **Version Management**
  - Complete transformation history
  - Branching and merging capabilities
  - Version comparison tools
  - Rollback functionality

- **Pipeline Automation**
  - Background processing with real-time status updates
  - Queue management for multiple operations
  - Error handling and recovery mechanisms

### 👥 User Management & Security
- **Authentication System**
  - Secure user registration and login
  - Password reset functionality
  - Email verification
  - Profile management

- **Access Control**
  - User-specific data isolation
  - Protected routes and API endpoints
  - Session management
  - Role-based permissions

### 📱 User Experience
- **Responsive Design**
  - Mobile-first approach
  - Cross-device compatibility
  - Touch-friendly interfaces

- **Dark/Light Mode**
  - System preference detection
  - Manual theme switching
  - Consistent theming across components

- **Real-time Updates**
  - Live processing status
  - Progressive loading indicators
  - Background synchronization

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19 (Fast development and optimized builds)
- **Routing**: React Router DOM 6.26.2
- **State Management**: 
  - TanStack Query 5.56.2 (Server state management)
  - React Hooks (Local state management)
- **UI Components**: 
  - Radix UI primitives for accessibility
  - shadcn/ui component library
  - Lucide React icons
- **Styling**: 
  - Tailwind CSS 3.4.11
  - CSS-in-JS with class variance authority
- **Data Visualization**:
  - Recharts 2.12.7 (Charts and graphs)
  - D3.js 3.x (Custom visualizations)
  - React Flow 11.11.4 (Version tree visualization)

### Backend & Database
- **Backend-as-a-Service**: Supabase
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication & authorization
  - File storage
  - Edge functions
- **API Integration**: RESTful API with custom preprocessing endpoints
- **Real-time Communication**: WebSocket connections for live updates

### Development & Deployment
- **Package Manager**: npm/bun
- **Code Quality**: 
  - ESLint 9.9.0 with TypeScript rules
  - TypeScript 5.5.3 (Strict mode)
- **Build Tools**: 
  - Vite with SWC for fast compilation
  - PostCSS for CSS processing
- **Deployment**: 
  - Vercel (Frontend hosting)
  - Vercel Analytics integration
- **Version Control**: Git with GitHub

## 🗄 Database Schema

The platform uses a relational PostgreSQL database with the following key entities:

### Core Tables

#### Users & Profiles
```sql
-- User profiles with authentication data
profiles (
  id: UUID (Primary Key, linked to auth.users)
  username: VARCHAR (Unique)
  full_name: VARCHAR
  avatar_url: VARCHAR
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

#### Tasks
```sql
-- Main project containers
Tasks (
  id: SERIAL (Primary Key)
  name: VARCHAR (Task name)
  user_id: UUID (Foreign Key -> profiles.id)
  raw_data: INTEGER (Foreign Key -> Files.id)
  processed_data: INTEGER (Foreign Key -> Files.id)
  category: INTEGER (Foreign Key -> Categories.id)
  status: ENUM ('RAW', 'PROCESSING', 'PROCESSED', 'FAILED')
  created_at: TIMESTAMP
  modified_at: TIMESTAMP
)
```

#### Task Methods (Version Control)
```sql
-- Version control for data transformations
TaskMethods (
  id: SERIAL (Primary Key)
  task_id: INTEGER (Foreign Key -> Tasks.id)
  method_id: INTEGER (Foreign Key -> Methods.id)
  name: VARCHAR (Version name)
  prev_version: INTEGER (Foreign Key -> TaskMethods.id, self-referencing)
  processed_file: INTEGER (Foreign Key -> Files.id)
  config: JSONB (Method configuration)
  pre_analysis: JSONB (Pre-analysis results)
  status: ENUM ('RAW', 'RUNNING', 'PROCESSED', 'FAILED')
  created_at: TIMESTAMP
)
```

#### Files
```sql
-- File storage metadata
Files (
  id: SERIAL (Primary Key)
  file_name: VARCHAR
  path: VARCHAR (Storage path)
  file_size: BIGINT
  created_at: TIMESTAMP
  modified_at: TIMESTAMP
)
```

#### Methods & Categories
```sql
-- Available preprocessing methods
Methods (
  id: SERIAL (Primary Key)
  label: VARCHAR (Display name)
  description: TEXT
  keyword: VARCHAR (Method identifier)
  is_enabled: BOOLEAN
  created_at: TIMESTAMP
)

-- Method categorization
Categories (
  id: SERIAL (Primary Key)
  name: VARCHAR
  description: TEXT
  created_at: TIMESTAMP
)

-- Many-to-many relationship
CategoryMethods (
  id: SERIAL (Primary Key)
  category_id: INTEGER (Foreign Key -> Categories.id)
  method_id: INTEGER (Foreign Key -> Methods.id)
  created_at: TIMESTAMP
)
```

### Data Types & Enums
```sql
-- Status enumeration for tasks and methods
CREATE TYPE status AS ENUM ('RAW', 'RUNNING', 'PROCESSED', 'FAILED');

-- Method categories
CREATE TYPE category AS ENUM ('cat_1', 'cat_2', 'cat_3');

-- Method types
CREATE TYPE method AS ENUM ('method_1', 'method_2', 'method_3');
```

### Key Relationships
- **One-to-Many**: Users → Tasks, Tasks → TaskMethods
- **Self-Referencing**: TaskMethods.prev_version → TaskMethods.id (version history)
- **Many-to-Many**: Categories ↔ Methods (via CategoryMethods)
- **File References**: Tasks and TaskMethods reference Files for data storage

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ or Bun
- Git
- Supabase account (for database)

### Local Development Setup

1. **Clone the Repository**
```bash
git clone <repository-url>
cd data-canvas-ux
```

2. **Install Dependencies**
```bash
npm install
# or
bun install
```

3. **Environment Configuration**
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_API=your_backend_api_url
```

4. **Database Setup**
- Create a new Supabase project
- Run the SQL migrations from `/supabase` directory
- Configure Row Level Security (RLS) policies

5. **Start Development Server**
```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

### Production Deployment

1. **Build the Application**
```bash
npm run build
```

2. **Deploy to Vercel**
```bash
vercel --prod
```

## 📖 Usage Guide

### Getting Started

1. **Registration**: Create an account with email verification
2. **Create Task**: Upload your first dataset (CSV format supported)
3. **Explore Data**: View data overview, statistics, and quality metrics
4. **Pre-Analysis**: Get automated insights and preprocessing recommendations
5. **Apply Methods**: Choose and configure preprocessing methods
6. **Monitor Progress**: Track processing status in real-time
7. **Analyze Results**: Explore cleaned data with correlation analysis
8. **Export Data**: Download processed datasets

### Workflow Example

```
Raw Data Upload → Pre-Analysis → Method Selection → Configuration → 
Processing → Results Review → Version Creation → Export
```

### Advanced Features

- **Version Comparison**: Compare different preprocessing approaches
- **Method Chaining**: Apply multiple preprocessing steps in sequence
- **Collaborative Analysis**: Share insights with team members
- **Performance Monitoring**: Track processing efficiency and success rates

## 🏗 Architecture Overview

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn)
│   ├── preprocessing/  # Preprocessing-specific components
│   ├── correlation/    # Correlation analysis components
│   └── dashboard/      # Dashboard widgets
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
└── integrations/       # External service integrations
```

### Data Flow
1. **User Input** → Frontend Components
2. **API Calls** → Supabase Client
3. **Database Operations** → PostgreSQL
4. **Background Processing** → External APIs
5. **Real-time Updates** → WebSocket Subscriptions
6. **State Updates** → React Components

### Security Measures
- **Authentication**: JWT-based authentication via Supabase Auth
- **Authorization**: Row Level Security (RLS) policies
- **Input Validation**: Client and server-side validation
- **Data Isolation**: User-specific data access controls
- **HTTPS**: All communications encrypted

## 📊 Performance Metrics

### Scalability Features
- **Lazy Loading**: Components and routes loaded on demand
- **Virtual Scrolling**: Efficient handling of large datasets
- **Background Processing**: Non-blocking data operations
- **Caching**: Strategic caching of frequently accessed data
- **Optimistic Updates**: Immediate UI feedback

### Monitoring & Analytics
- **User Activity Tracking**: Vercel Analytics integration
- **Performance Monitoring**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error logging
- **Usage Statistics**: Method usage and success rates

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure ESLint compliance
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **Component Structure**: Functional components with hooks
- **Styling**: Tailwind CSS classes
- **Naming**: camelCase for variables, PascalCase for components
- **Documentation**: JSDoc comments for complex functions

## 📝 License

This project is developed for academic purposes as part of a university course. All rights reserved.

## 👨‍🎓 Academic Context

**Course**: Data Processing and Analysis
**Institution**: Frankfurt University of Applied Sciences
**Semester**: 03 Semester
**Team**: 
- Syed Hasan Faaz Abidi
- Murad Siddiqui
- Syed Hassnain Kazmi
- Ahsan Habib
- Osman Ghani

### Project Goals
- Demonstrate full-stack development capabilities
- Apply data science concepts in a web application
- Implement modern web technologies and best practices
- Create a production-ready application with real-world applicability

### Technical Achievements
- **Responsive Design**: Mobile-first approach with cross-device compatibility
- **Real-time Processing**: Background job processing with live status updates
- **Data Visualization**: Interactive charts and correlation analysis
- **Version Control**: Git-like versioning for data transformations
- **Modern Architecture**: Component-based design with TypeScript safety
- **Database Design**: Normalized schema with proper relationships
- **Security Implementation**: Authentication, authorization, and data protection

---

*Built with ❤️ for the future of data preprocessing and analysis*