#### Difference between `Named Volume` and `Bind Mount` in Docker volume

1. Named Volume (What you have now):
   Code: - minio_data:/data
   Where it lives: Docker manages this storage internally (hidden deep inside Docker's virtual machine). It is not created in your project folder.
   Pros: Better performance, fewer permission issues.
   Cons: You can't see the files easily.

2. Bind Mount (What you probably want):
   Code: - ./minio_data:/data (Notice the dot and slash ./)
   Where it lives: This tells Docker "Create a folder named minio_data right here in my project and use it."
   Pros: You can open the folder in Windows and see your JSON files appearing.
