
//
#import "HookUtil.h"
#import <objc/runtime.h>
#import <CoreLocation/CoreLocation.h>
#import "TQLocationConverter.h"

//
bool _fake;
CLLocationCoordinate2D _coordinate;
NS_INLINE CLLocation *FakeLocation(CLLocation *location)
{
	return _fake ? [[CLLocation alloc] initWithCoordinate:_coordinate
												 altitude:location.altitude
									   horizontalAccuracy:location.horizontalAccuracy
										 verticalAccuracy:location.verticalAccuracy
												timestamp:location.timestamp] : location;
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
	void (*old)(id self, SEL sel, CLLocationManager *manager, NSArray<CLLocation *> *locations) = [objc_getAssociatedObject(self.class, @"_locationManager_didUpdateLocations_") pointerValue];
	
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
	if (!objc_getAssociatedObject(delegate.class, @"_locationManager_didUpdateLocations_"))
	{
		Method method = class_getInstanceMethod(delegate.class, @selector(locationManager:didUpdateLocations:));
		if (method)
		{
			IMP old = method_setImplementation(method, (IMP)$CLLocationManagerDelegate_locationManager_didUpdateLocations_);
			objc_setAssociatedObject(delegate.class, @"_locationManager_didUpdateLocations_", [NSValue valueWithPointer:old], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
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

//
@protocol QMapView <CLLocationManagerDelegate>
- (CLLocationManager *)locationManager;
- (CLLocation *)userLocation;
- (CLLocationCoordinate2D)centerCoordinate;
- (void)pinUserLocation:(id)sender;
- (void)setUserTrackingMode:(int)mode animated:(BOOL)animated;
- (BOOL)chinaContainsCoordinate:(CLLocationCoordinate2D)coordinate;
@end

@protocol POIInfo <NSObject>
- (CLLocationCoordinate2D)coordinate;
@end

@protocol MMPickLocationViewController <NSObject>
- (id<POIInfo>)getCurrentPOIInfo;
- (UIView *)view;
@end

//
@interface FakeLocationButton : UIButton
- (instancetype)initWithController:(id<MMPickLocationViewController>)controller;
@property(nonatomic,assign) id<MMPickLocationViewController> controller;
@end


//
_HOOK_MESSAGE(void, MMPickLocationViewController, viewDidAppear_, BOOL animation)
{
	_MMPickLocationViewController_viewDidAppear_(self, sel, animation);
	
	UIButton *button = [[FakeLocationButton alloc] initWithController:self];
	[[self view] addSubview:button];
}

//
@implementation FakeLocationButton

//
+ (void)load
{
	NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
	NSNumber *latitude = [defaults objectForKey:@"ArmorLatitude"];
	NSNumber *longitude = [defaults objectForKey:@"ArmorLongitude"];
	if (latitude && longitude)
	{
		_fake = true;
		_coordinate.latitude = latitude.doubleValue;
		_coordinate.longitude = longitude.doubleValue;
	}
	_Init_MMPickLocationViewController_viewDidAppear_();
}

//
- (instancetype)initWithController:(id<MMPickLocationViewController>)controller
{
	self = [super initWithFrame:CGRectMake(12, 120, 90, 30)];

	_controller = controller;
	self.backgroundColor = [UIColor colorWithWhite:0.5 alpha:0.7];
	self.titleLabel.font = [UIFont systemFontOfSize:12];
	self.clipsToBounds = YES;
	self.layer.cornerRadius = 4;
	
	[self addTarget:self action:@selector(toggle) forControlEvents:UIControlEventTouchUpInside];
	[self updateTitle];
	
	return self;
}

//
- (void)toggle
{
	NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
	
	if (_fake)
	{
		_fake = false;
		[defaults removeObjectForKey:@"ArmorLatitude"];
		[defaults removeObjectForKey:@"ArmorLongitude"];
	}
	else
	{
		id<POIInfo> info = _controller.getCurrentPOIInfo;
		if (info == nil)
		{
			[[[UIAlertView alloc] initWithTitle:@"错误" message:@"未能获取当前坐标" delegate:nil cancelButtonTitle:@"好吧" otherButtonTitles:nil] show];
			return;
		}
		_fake = true;
		_coordinate = info.coordinate;
		if (![TQLocationConverter isLocationOutOfChina:_coordinate])
		{
			_coordinate = [TQLocationConverter transformFromGCJToWGS:_coordinate];
		}
		
		//NSLog(@"getCurrentPOIInfo: %lf,%lf", _coordinate.latitude, _coordinate.longitude);
		[defaults setObject:[NSNumber numberWithDouble:_coordinate.latitude] forKey:@"ArmorLatitude"];
		[defaults setObject:[NSNumber numberWithDouble:_coordinate.longitude] forKey:@"ArmorLongitude"];
	}
	
	for (id<QMapView> view in _controller.view.subviews)
	{
		if ([NSStringFromClass(view.class) isEqualToString:@"QMapView"])
		{
			[view.locationManager stopUpdatingLocation];
			[view.locationManager startUpdatingLocation];
			if (!_fake)
				[view setUserTrackingMode:0 animated:YES];
			break;
		}
	}
	
	[self updateTitle];
}

//
- (void)updateTitle
{
	[self setTitle:_fake ? @"恢复真实位置" : @"设为模拟位置" forState:UIControlStateNormal];
	[self setTitleColor:_fake ? UIColor.redColor : UIColor.whiteColor forState:UIControlStateNormal];
}

@end
