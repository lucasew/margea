# The ciborg CI failed and there are no logs available.
# But looking at Vercel deployment: usually when building on Vercel, it runs `npm run build`.
# I just ran `npm run build` and `npx tsc --noEmit` and BOTH PASSED cleanly!
# Why would `ciborg` fail?
# Maybe there are some unused imports that ESLint caught?
# Or maybe the PR caused Vercel to skip the build or something?
# Is there anything else that Vercel needs?
# Wait! I added a `.prettierignore`!
# Could `.prettierignore` break the Vercel build? Unlikely.
# What else did I do?
# I modified `eslint.config.js` to ignore `.astro`!
# Let's check `npx eslint .`
