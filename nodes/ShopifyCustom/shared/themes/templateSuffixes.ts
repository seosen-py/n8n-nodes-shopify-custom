import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';

interface IThemeFileNode {
	filename: string;
}

interface IThemeNode {
	id: string;
	name: string;
	files?: {
		nodes?: IThemeFileNode[];
	};
}

interface IThemesResponse {
	themes?: {
		nodes?: IThemeNode[];
	};
}

const THEME_TEMPLATE_FILES_QUERY = `
query ThemeTemplateFiles($themeFirst: Int!, $filesFirst: Int!) {
	themes(first: $themeFirst, roles: [MAIN]) {
		nodes {
			id
			name
			files(first: $filesFirst) {
				nodes {
					filename
				}
			}
		}
	}
}
`;

const CACHE_TTL_MS = 2 * 60 * 1000;
const templateSuffixCache = new Map<string, { expiresAt: number; data: INodePropertyOptions[] }>();

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toSuffixLabel(value: string): string {
	return value
		.split(/[._-]/g)
		.filter((chunk) => chunk.length > 0)
		.map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
		.join(' ');
}

function parseTemplateSuffix(filename: string, templateName: string): string | undefined {
	const matcher = new RegExp(`^templates/${escapeRegex(templateName)}(?:\\.(.+))?\\.json$`);
	const match = filename.match(matcher);
	if (!match) {
		return undefined;
	}
	return match[1] ?? '';
}

export async function getTemplateSuffixOptions(
	context: ILoadOptionsFunctions,
	templateName: string,
): Promise<INodePropertyOptions[]> {
	const cacheKey = templateName;
	const cached = templateSuffixCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	const response = await executeShopifyGraphql<IThemesResponse>(
		context,
		THEME_TEMPLATE_FILES_QUERY,
		{
			themeFirst: 1,
			filesFirst: 250,
		},
		0,
	);
	assertNoGraphQLErrors(context, response, 0);

	const theme = response.data?.themes?.nodes?.[0];
	const files = theme?.files?.nodes ?? [];
	const suffixSet = new Set<string>();
	for (const file of files) {
		const suffix = parseTemplateSuffix(String(file.filename ?? ''), templateName);
		if (suffix !== undefined) {
			suffixSet.add(suffix);
		}
	}

	const dynamicOptions = Array.from(suffixSet)
		.filter((suffix) => suffix.length > 0)
		.sort((a, b) => a.localeCompare(b))
		.map((suffix) => ({
			name: toSuffixLabel(suffix),
			value: suffix,
		}));

	const options: INodePropertyOptions[] = [
		{
			name: 'Default',
			value: '',
			description: 'Use the default template',
		},
		...dynamicOptions,
	];

	templateSuffixCache.set(cacheKey, {
		expiresAt: Date.now() + CACHE_TTL_MS,
		data: options,
	});

	return options;
}
