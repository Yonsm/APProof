
#import <dlfcn.h>
#import "HookUtil.h"

//
void _HookFunction(const char *lib, const char *fun, void *hook, void **old)
{
	void *symbol = dlsym(dlopen(lib, RTLD_LAZY), fun);

	//
	static void (*_MSHookFunction)(void *symbol, void *hook, void **old) = NULL;
	if (_MSHookFunction == NULL)
	{
		_MSHookFunction = dlsym(dlopen("/Library/Frameworks/CydiaSubstrate.framework/CydiaSubstrate", RTLD_LAZY), "MSHookFunction");
	}

	//
	if (_MSHookFunction)
	{
		_MSHookFunction(symbol, hook, old);
	}
	else
	{
		*old = NULL;
	}
}

//
void _HookMessage(Class cls, const char *msg, void *hook, void **old)
{
	//
	char name[1024];
	
	char *p = name;
	do
	{
		*p++ = (*msg == '_') ? ((msg[1] == '_') ? *msg++ : ':') : *msg;
	}
	while (*msg++);
	SEL sel = sel_registerName(name);

	//
	static void (*_MSHookMessageEx)(Class cls, SEL sel, void *hook, void **old) = NULL;
	if (_MSHookMessageEx == nil)
	{
		_MSHookMessageEx = dlsym(dlopen("/Library/Frameworks/CydiaSubstrate.framework/CydiaSubstrate", RTLD_LAZY), "MSHookMessageEx");
	}

	//
	if (_MSHookMessageEx)
	{
		_MSHookMessageEx(cls, sel, hook, old);
	}
	else
	{
		*old = method_setImplementation(class_getInstanceMethod(cls, sel), hook);
	}
}
