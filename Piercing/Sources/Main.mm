
//
#if __cplusplus
extern "C"
#endif

__attribute__((constructor)) int main()
{
	_LogLine();
	return 0;
}
