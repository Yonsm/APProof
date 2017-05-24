
#import <stdlib.h>
#import <dlfcn.h>
#import "HookUtil.h"
//#define _Support_CydiaSubstrate

//#import <Foundation/Foundation.h>

#import "FishHook.h"

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

	//*old = dlsym(RTLD_DEFAULT, "dlsym");
	rebind_symbols((struct rebinding[1]){{"dlsym", hook}}, 1);
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
void HUHookFunctionForDylib(const char *lib, const char *func, void *hook, void **old)
{
#ifdef _Support_CydiaSubstrate
	void *symbol = dlsym(dlopen(lib, RTLD_LAZY), func);
	HUHookFunction(symbol, hook, old);
#else
	rebind_symbols((struct rebinding[1]){{func, hook, old}}, 1);
#endif
}

//
void HUHookMessageWithName(Class cls, const char *name, IMP hook, IMP *old)
{
	char msg[1024], *p = msg;
	do
	{
		*p++ = (*name == '_') ? ((name[1] == '_') ? *name++ : ':') : *name;
	}
	while (*name++);
	SEL sel = sel_registerName(msg);
	
	HUHookMessage(cls, sel, hook, old);
}


//
bool HUIsAnyOneMatched(const char *any, const char *one, char separator)
{
	for (const char *p = one; true; any++)
	{
		if (*p)
		{
			if (*any == *p)
			{
				p++;
				continue;
			}
			else if (*any == 0)
			{
				return false;
			}
			else if (*any == '|')
			{
				p = one;
				continue;
			}
		}
		else if (*any == 0 || *any == '|')
		{
			return true;
		}
		
		for (; *any != '|'; any++)
		{
			if (*any == 0)
			{
				return false;
			}
		}
		p = one;
	}
}

//
void HUHookFunctionForProcess(const char *proc, const char *lib, const char *func, void *hook, void **old)
{
	if (HUIsAnyOneMatched(proc, getprogname(), '|'))
	{
		HUHookFunctionForDylib(lib, func, hook, old);
	}
}

//
void HUHookMessageForProcess(const char *proc, Class cls, const char *name, IMP hook, IMP *old)
{
	if (HUIsAnyOneMatched(proc, getprogname(), '|'))
	{
		HUHookMessageWithName(cls, name, hook, old);
	}
}
