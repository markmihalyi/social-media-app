# Outdated Project

Since I was really newbie when I made this project, the project's file structure isn't that great for maintainability and best practices are rarely used in this project.
Although, the code worked fine, I still had a long way to the perfection then.

**Important note: in this project all of the business logics are inside the routers, but it's a really bad practice. In my recent projects (private yet) I always make controllers and I put the business logic inside the controller files.**

# Todo

### In Progress

-   Friend system:
    - [x] Get a user's friend list (GET: list)
    - [x] Send friend request to a user (POST: request)
    - [X] Cancel friend request (DELETE: request) 
    - [X] Accept friend request (PUT: accept)
    - [ ] Decline friend request (PUT: decline)

### Done ✓

-   [x] React to posts feature (sendReaction, undoReaction, getReaction)
-   [x] Comment to posts feature (newComment, deleteComment)
-   [x] Manage posts feature (createPost, deletePost, getPosts)
-   [x] JWT authentication
