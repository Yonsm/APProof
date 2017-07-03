
//
#import "HookUtil.h"
#import <objc/runtime.h>
#import <CoreLocation/CoreLocation.h>

//
//HOOK_MESSAGE(void, CLLocationManager, onClientEventLocation_, id foo)
//{
//	// no-op - this suppresses location change events that are raised by CLLocationManager
//}
//
////
//HOOK_MESSAGE(void, CLLocationManager, startUpdatingLocation)
//{
//	// no-op - this suppresses location change events that are raised by CLLocationManager
//	[(CLLocationManager *)self setDelegate:(id<CLLocationManagerDelegate> _Nullable)]
//}

//
void $CLLocationManagerDelegateFaker_locationManager_didUpdateLocations_(NSObject *self, SEL sel, CLLocationManager *manager, NSArray<CLLocation *> *locations)
{
	void (*old)(id self, SEL sel, CLLocationManager *manager, NSArray<CLLocation *> *locations) = [objc_getAssociatedObject(self.class, @"didUpdateLocationsHook") pointerValue];
	CLLocation *location = [[CLLocation alloc] initWithLatitude:27.840109 longitude:121.157791];
	old(self, sel, manager, @[location]);
}

//
void $CLLocationManagerDelegateFaker_locationManager_didUpdateToLocation_fromLocation_(NSObject *self, SEL sel, CLLocationManager *manager, CLLocation *location, CLLocation *from)
{
	void (*old)(id self, SEL sel, CLLocationManager *manager, CLLocation *location, CLLocation *from) = [objc_getAssociatedObject(self.class, @"didUpdateToLocationHook") pointerValue];
	
	CLLocation *location2 = [[CLLocation alloc] initWithLatitude:27.840109 longitude:121.157791];
	//location2.altitude = 65;
	old(self, sel, manager, location2, nil);
}

//
HOOK_MESSAGE(void, CLLocationManager, setDelegate_, id<CLLocationManagerDelegate> delegate)
{
	//dispatch_async(dispatch_get_main_queue(), ^{
	if ([delegate respondsToSelector:@selector(locationManager:didUpdateLocations:)])
	{
		if (objc_getAssociatedObject(delegate.class, @"didUpdateLocationsHook") == nil)
		{
			Method method = class_getInstanceMethod(delegate.class, @selector(locationManager:didUpdateToLocation:fromLocation:));
			if (method)
			{
				IMP old = method_setImplementation(method, (IMP)$CLLocationManagerDelegateFaker_locationManager_didUpdateToLocation_fromLocation_);
				objc_setAssociatedObject(delegate.class, @"didUpdateLocationsHook", [NSValue valueWithPointer:old], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
			}
		}
	}
	if ([delegate respondsToSelector:@selector(locationManager:didUpdateToLocation:fromLocation:)])
	{
		if (objc_getAssociatedObject(delegate.class, @"didUpdateToLocationHook") == nil)
		{
			Method method = class_getInstanceMethod(delegate.class, @selector(locationManager:didUpdateToLocation:fromLocation:));
			if (method)
			{
				IMP old = method_setImplementation(method, (IMP)$CLLocationManagerDelegateFaker_locationManager_didUpdateToLocation_fromLocation_);
				objc_setAssociatedObject(delegate.class, @"didUpdateToLocationHook", [NSValue valueWithPointer:old], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
			}
		}
	}
	//});
	
	_CLLocationManager_setDelegate_(self, sel, delegate);
}
