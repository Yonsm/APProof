
//
#import "HookUtil.h"

//
int $ptrace(int request, pid_t pid, caddr_t addr, int data)
//_HOOK_FUNCTION(int, /usr/lib/libSystem.B.dylib, ptrace, int request, pid_t pid, caddr_t addr, int data)
{
	return 0;
}

//
_HOOK_FUNCTION(void *, /usr/lib/libSystem.B.dylib, dlsym, void *handle, const char *symbol)
{
	if (strcmp(symbol, "ptrace") == 0)
	{
		_LogLine();
		return (void *)&$ptrace;
	}

	return _dlsym(handle, symbol);
}

//
__attribute__((constructor)) int main()
{
	_LogLine();
	_Init_dlsym();
	return 0;
}
