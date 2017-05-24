
#import <dlfcn.h>
#import "HookUtil.h"

#define _Support_CydiaSubstrate

//
void HUHookFunction(void *symbol, void *hook, void **old)
{
#ifdef _Support_CydiaSubstrate
	static void (*_MSHookFunction)(void *symbol, void *hook, void **old) = NULL;
	if (_MSHookFunction == NULL)
	{
		_MSHookFunction = dlsym(dlopen("/Library/Frameworks/CydiaSubstrate.framework/CydiaSubstrate", RTLD_LAZY), "MSHookFunction");
		_Log(@"HookUtil: _MSHookFunction = %p", _MSHookFunction);
		if (_MSHookFunction == NULL)
		{
			_MSHookFunction = (void *)-1;
		}
	}
	
	//
	if (_MSHookFunction && (_MSHookFunction != (void *)-1))
	{
		return _MSHookFunction(symbol, hook, old);
	}
#endif
	
	*old = NULL;
}

//
void HUHookMessage(Class cls, SEL sel, IMP hook, IMP *old)
{
#ifdef _Support_CydiaSubstrate
	static void (*_MSHookMessageEx)(Class cls, SEL sel, IMP hook, IMP *old) = NULL;
	if (_MSHookMessageEx == nil)
	{
		_MSHookMessageEx = dlsym(dlopen("/Library/Frameworks/CydiaSubstrate.framework/CydiaSubstrate", RTLD_LAZY), "MSHookMessageEx");
		_Log(@"HookUtil: _MSHookMessageEx = %p", _MSHookMessageEx);
		if (_MSHookMessageEx == NULL)
		{
			_MSHookMessageEx = (void *)-1;
		}
	}
	
	//
	if (_MSHookMessageEx && (_MSHookMessageEx != (void *)-1))
	{
		return _MSHookMessageEx(cls, sel, hook, old);
	}
#endif
	
	Method method = class_getInstanceMethod(cls, sel);
	if (method == NULL)
	{
		_Log(@"HookUtil: HookMessage Could not find [%@ %s]", cls, sel_getName(sel));
	}
	else
	{
		*old = method_setImplementation(method, hook);
	}
}

//
void _HookFunction(NSString *processNames, const char *lib, const char *fun, void *hook, void **old)
{
	if (processNames && ![[processNames componentsSeparatedByString:@"|"] containsObject:NSProcessInfo.processInfo.processName])
	{
		return;
	}
	
	void *symbol = dlsym(dlopen(lib, RTLD_LAZY), fun);
	return HUHookFunction(symbol, hook, old);
}

//
void _HookMessage(NSString *processNames, Class cls, const char *msg, void *hook, void **old)
{
	if (processNames && ![[processNames componentsSeparatedByString:@"|"] containsObject:NSProcessInfo.processInfo.processName])
	{
		return;
	}
	
	//
	char name[1024];
	
	char *p = name;
	do
	{
		*p++ = (*msg == '_') ? ((msg[1] == '_') ? *msg++ : ':') : *msg;
	}
	while (*msg++);
	SEL sel = sel_registerName(name);
	
	return HUHookMessage(cls, sel, hook, (IMP *)old);
}
