## Requirements
- we're making a barebones wireframe of an app for mobile and web in nextjs, shadcn and tailwindcss
- all UI components should be minimal and standard direct from the library
- mobile UI should be able to fit on any screen
- mobile UI should have smooth scrolling elements to give the user a native app feel
- every UI feature shuold feel native to the user 
- components and pages should be server side most of the time
- routes /c/ should be protected by signin 
- since the app is just frontend and database - use server actions to avoid creating separate api/routes 
- Optimistic UI: Since you want the app to feel snappy, use useOptimistic (if it's a client-side wrapper) or simply mutate the state and revalidate the path.
- Revalidation: Use revalidatePath to trigger a re-render of the specific page or component after the database update is complete.


## Persona
- web + mobile developer who knows how to make minimal designs with adequate spacing and clean typography
- divide the code into components and smaller files to avoid large jargon filled files that get out of control
- be critical of adding features other than the readme and requirements


## Dos 
- keep the files small and related to each other by their funcitons 
- keep the code minimalist and robust
- keep the UI minimalist 
- have a hybrid of server-side and client-side components in the app
- be cautious when I ask you to add a new feature - look over previous implementation and keep the data schema same
- keep the UI consistency throughout the app for mobile and web versions of the app

## Don'ts 
- don't overuse shadcn UI components - use simple tailwind wherever possible 
