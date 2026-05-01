# Billing System

A web-based billing and sales management system for recording bills, managing petty cash fund requests, handling event forms, and tracking sales reports.

## Overview

The Billing System is a React application built to help users organize billing records, petty cash fund transactions, sales dashboard data, and company event forms in one place. It includes protected routes, Supabase-backed data services, printable forms, and export tools so users can manage daily business records more efficiently.

## Features

- User login and protected application pages
- Bill creation, viewing, editing, searching, and voiding
- Petty Cash Fund (PCF) creation, approval/rejection, viewing, editing, and voiding
- Daily sales encoder and dashboard pages
- Sales report, sales metrics, inventory report, and reports modules
- Event request, prospect invitation, and special company events forms
- Print-ready receipts, reports, and forms
- PDF, Excel, and CSV export support
- Supabase integration for backend data storage

## System Purpose

This system solves the problem of manually tracking billing, sales, PCF, and event form records across separate files or paper-based workflows. It provides a centralized interface where users can encode records, review transaction details, generate reports, print documents, and export data for monitoring and documentation.

## Technologies Used

- React
- TypeScript
- Vite
- React Router
- Supabase
- Radix UI
- Lucide React
- Sonner
- SweetAlert2
- jsPDF and jsPDF AutoTable
- html2canvas
- xlsx
- PapaParse
- CSS

## Installation

1. Clone or open the project folder.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root and add your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL shown in the terminal, usually:

   ```text
   http://localhost:5173
   ```

## Usage

After starting the system, log in using a valid user account. Once authenticated, users can access the billing page, create and manage bills, process PCF records, open event forms, and use the sales dashboard to encode sales data and review reports. Records can also be printed or exported depending on the available actions on each page.

## Screenshots

Screenshots can be added here to show the login page, billing list, PCF module, event forms, and sales dashboard.

## Author

Najeeb C. Mapantas
