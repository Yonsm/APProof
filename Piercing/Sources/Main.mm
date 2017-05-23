
//
#import <objc/runtime.h>
#import "Prefix.pch"
#import <dlfcn.h>
#import "fishhook.h"

static void * (*orig_dlsym)(void *, const char *);

int my_ptrace(int _request, pid_t _pid, caddr_t _addr, int _data)
{
	return 0;
}

void * my_dlsym(void * __handle, const char * __symbol)
{
	if (strcmp(__symbol, "ptrace") == 0) {
		//return &my_ptrace;
	}
	
	return orig_dlsym(__handle, __symbol);
}

__attribute__((constructor)) void init()
{
	_LogLine();
	//orig_dlsym = dlsym(RTLD_DEFAULT, "dlsym");
	//rebind_symbols((struct rebinding[1]){{"dlsym", my_dlsym}}, 1);
}
