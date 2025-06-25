# Brace
Brace is a full-stack, multi-role task, ticket, and agent management system developed as part of my A-level Computer Science NEA project. It consists of two integrated web applications — one for customers and one for support staff (agents and administrators).

Brace streamlines technical support operations by combining ticket tracking, task management, real-time communication, and admin coordination in a single system.

## Features
*Customer Portal*
- Submit support tickets through a web interface  
- View existing tickets and their statuses  
- Real-time chat with assigned support agents  

*Agent & Admin Portal*
Agents can:
- Respond to assigned customer tickets  
- Mark tickets and tasks as completed  
- Communicate with customers in real time  

Admins can:
- Create and assign tasks to agents  
- Manage agent and admin accounts  
- Coordinate workflows through a calendar dashboard  

*Calendar View*
- Visualise tickets and tasks by date  
- Role-specific calendar views (agents see assigned tasks; admins see all activity)

*Automated Ticket Assignment*/
New tickets are automatically assigned to available agents based on workload

## Tech Stack
- Frontend: HTML, CSS, JavaScript (with responsive design)  
- Backend: Node.js with Express  
- Database: MySQL  
- Real-time Communication: WebSockets (`ws`)  

## Background
Brace was built to strengthen my skills in full-stack web development, real-time backend systems, modular design, and cloud deployment. The system is designed to reflect real-world technical support workflows with clear role separation. It was previously deployed on Render, with data stored using alwaysdata and real-time communication powered by Redis, but it is no longer active.

## Limitations
- No media/file support in ticket chat  
- Admins cannot directly respond to or manage tickets  
- Agents are not notified when tickets are automatically assigned to them
