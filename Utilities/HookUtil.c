
#import <stdlib.h>
#import <dlfcn.h>
#import "HookUtil.h"
#import "FishHook.h"

//
void HUHookFunction(const char *lib, const char *func, void *hook, void **old)
{
#ifdef _Support_CydiaSubstrate
	void *symbol = dlsym(dlopen(lib, RTLD_LAZY), func);
	HUHookFunction(symbol, hook, old);
#else
	rebind_symbols((struct rebinding[1]){{func, hook, old}}, 1);
#endif
}

//
void HUHookMessage(Class cls, const char *name, IMP hook, IMP *old)
{
	char msg[1024], *p = msg;
	do
	{
		*p++ = (*name == '_') ? ((name[1] == '_') ? *name++ : ':') : *name;
	}
	while (*name++);
	SEL sel = sel_registerName(msg);

	//
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
		HUHookFunction(lib, func, hook, old);
	}
}

//
void HUHookMessageForProcess(const char *proc, Class cls, const char *name, IMP hook, IMP *old)
{
	if (HUIsAnyOneMatched(proc, getprogname(), '|'))
	{
		HUHookMessage(cls, name, hook, old);
	}
}
