# APProof
Armor Piercing Proof

An iOS application template, to inject dynamic hook for an third-party AppStore's App, without device jailbroken.

1. Download this project;
2. Got AppStore's App, decrypt it with Clutch or dumpdecrypted;
3. Put decrypted app into Proof/*.app;
4. (Optional) Maybe you sould remove some extensions or *.app/Frameworks (to avoid code sign related problem);
5. Modify hook code in Piercing/Source;
5. Modify app Id in Amor;
7. Rebuild Amor project and run it, now you can debug the third-party AppStore's App with your dylib injected in Xcode!
