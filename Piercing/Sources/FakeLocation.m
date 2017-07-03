
//
#import "HookUtil.h"
#import <objc/runtime.h>
#import <CoreLocation/CoreLocation.h>


NS_INLINE CLLocation *FakeLocation(CLLocation *location)
{
	return [[CLLocation alloc] initWithCoordinate:(CLLocationCoordinate2D){27.840109, 121.157791}
										 altitude:location.altitude
							   horizontalAccuracy:location.horizontalAccuracy
								 verticalAccuracy:location.verticalAccuracy
										timestamp:location.timestamp];
}

//
#if _FOR_WECHAT_ONLY

//
HOOK_MESSAGE(void, MMLocationMgr, locationManager_didUpdateToLocation_fromLocation_, CLLocationManager *manager, CLLocation *location, CLLocation *from)
{
	_MMLocationMgr_locationManager_didUpdateToLocation_fromLocation_(self, sel, manager, FakeLocation(location), nil);
}

//
HOOK_MESSAGE(void, QMapView, locationManager_didUpdateToLocation_fromLocation_, CLLocationManager *manager, CLLocation *location, CLLocation *from)
{
	_QMapView_locationManager_didUpdateToLocation_fromLocation_(self, sel, manager, FakeLocation(location), nil);
}

#else


void $CLLocationManagerDelegate_locationManager_didUpdateLocations_(NSObject *self, SEL sel, CLLocationManager *manager, NSArray<CLLocation *> *locations)
{
	void (*old)(id self, SEL sel, CLLocationManager *manager, NSArray<CLLocation *> *locations) = [objc_getAssociatedObject(self.class, @"_locationManager_didUpdateToLocation_fromLocation_") pointerValue];
	
	old(self, sel, manager, locations.count ? @[FakeLocation(locations[0])] : nil);
}

//
void $CLLocationManagerDelegate_locationManager_didUpdateToLocation_fromLocation_(NSObject *self, SEL sel, CLLocationManager *manager, CLLocation *location, CLLocation *from)
{
	void (*old)(id self, SEL sel, CLLocationManager *manager, CLLocation *location, CLLocation *from) = [objc_getAssociatedObject(self.class, @"_locationManager_didUpdateToLocation_fromLocation_") pointerValue];
	old(self, sel, manager, FakeLocation(location), nil);
}

//
HOOK_MESSAGE(void, CLLocationManager, setDelegate_, id<CLLocationManagerDelegate> delegate)
{
	if (!objc_getAssociatedObject(delegate.class, @"_locationManager_didUpdateToLocation_fromLocation_"))
	{
		Method method = class_getInstanceMethod(delegate.class, @selector(locationManager:didUpdateToLocation:fromLocation:));
		if (method)
		{
			IMP old = method_setImplementation(method, (IMP)$CLLocationManagerDelegate_locationManager_didUpdateToLocation_fromLocation_);
			objc_setAssociatedObject(delegate.class, @"_locationManager_didUpdateToLocation_fromLocation_", [NSValue valueWithPointer:old], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
		}
	}
	if (!objc_getAssociatedObject(delegate.class, @"_locationManager_didUpdateToLocation_fromLocation_"))
	{
		Method method = class_getInstanceMethod(delegate.class, @selector(locationManager:didUpdateToLocation:fromLocation:));
		if (method)
		{
			IMP old = method_setImplementation(method, (IMP)$CLLocationManagerDelegate_locationManager_didUpdateToLocation_fromLocation_);
			objc_setAssociatedObject(delegate.class, @"_locationManager_didUpdateToLocation_fromLocation_", [NSValue valueWithPointer:old], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
		}
	}
	
	_CLLocationManager_setDelegate_(self, sel, delegate);
}

#endif
