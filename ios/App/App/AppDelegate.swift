import UIKit
import WebKit
import Capacitor

// The Capacitor WKWebView draws edge-to-edge under the status bar / Dynamic
// Island, but WebKit reports env(safe-area-inset-*) as 0 in this configuration,
// so CSS alone can't clear the status bar. This bridge subclass reads the real
// native safe-area insets and exposes them to the web layer as CSS custom
// properties (--safe-area-inset-*), which overrides/mobile.css consumes to pad
// the sticky header. Re-applied on layout/rotation and after the page loads.
// (Android handles the equivalent natively in MainActivity.)
class MainViewController: CAPBridgeViewController {
    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        applySafeAreaInsets()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applySafeAreaInsets()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // The initial page may still be loading when layout first settles, so
        // re-apply a few times to cover that window without a visible jump.
        for delay in [0.1, 0.4, 1.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.applySafeAreaInsets()
            }
        }
    }

    private func applySafeAreaInsets() {
        guard let webView = self.webView else { return }
        let insets = view.safeAreaInsets
        let js = """
        (function(){var d=document.documentElement;if(!d){return;}\
        d.style.setProperty('--safe-area-inset-top','\(insets.top)px');\
        d.style.setProperty('--safe-area-inset-right','\(insets.right)px');\
        d.style.setProperty('--safe-area-inset-bottom','\(insets.bottom)px');\
        d.style.setProperty('--safe-area-inset-left','\(insets.left)px');})();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
