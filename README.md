# APProof
Armor Piercing Proof

An iOS application template, to inject dynamic hook for an existed/AppStore's App, without jailbroken.

1. Download this project;
2. Got AppStore's App, decrypt with Clutch or dumpdecrypted;
3. Put decrypted app into Proof/***.app;
4. (Optional) Maybe you sould remove some extensions or ***.app/Frameworks (to avoid code sign related problem);
5. Modify app Id;
6. Modify hook code in Piercing;
7. Rebuild Amor project and run it, now you can debug the Third-Party AppStore's App with your dylib injected in Xcode!
