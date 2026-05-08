# Billing System

A web-based billing management system for recording bills, managing petty cash fund requests, and handling event forms.

## Overview

The Billing System is a React application built to help users organize billing records, petty cash fund transactions, and company event forms in one place. It includes protected routes, Supabase-backed data services, printable forms, and export tools so users can manage daily business records more efficiently.

## Features

- User login and protected application pages
- Bill creation, viewing, editing, searching, and voiding
- Petty Cash Fund (PCF) creation, approval/rejection, viewing, editing, and voiding
- Event request, prospect invitation, and special company events forms
- Print-ready receipts, reports, and forms
- PDF, Excel, and CSV export support
- Supabase integration for backend data storage

## System Purpose

This system solves the problem of manually tracking billing, PCF, and event form records across separate files or paper-based workflows. It provides a centralized interface where users can encode records, review transaction details, generate reports, print documents, and export data for monitoring and documentation.

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

After starting the system, log in using a valid user account. Once authenticated, users can access the billing page, create and manage bills, process PCF records, and open event forms. Records can also be printed or exported depending on the available actions on each page.

## Screenshots

### Login Page
<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/5d08890b-896a-4c79-b91b-aa58c60ab004" />

### Bills Page
<img width="1903" height="958" alt="image" src="https://github.com/user-attachments/assets/f74e8b66-08a4-4214-a599-84a06efe499d" />

### Petty Cash Page
<img width="1899" height="956" alt="image" src="https://github.com/user-attachments/assets/50bfcf0f-a5ac-42c8-8021-6876a8c1df80" />

### Event Forms Page
<img width="1904" height="1079" alt="image" src="https://github.com/user-attachments/assets/36dadbc7-2f4c-4efd-9396-aa330280ed3f" />


## Author

Najeeb C. Mapantas
