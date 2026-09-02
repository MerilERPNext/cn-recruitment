export default interface CompanyLogo {
    company_name: string;
    company_logo: string | null;
    name: string;
    file_url: string;
    /**
     * Optional Company field (added by homefirst_customs). When checked, the
     * company name is printed beside a circular logo; when unchecked the logo
     * stands alone, rendered wide so a wordmark isn't cropped.
     */
    custom_logo_has_company_name?: 0 | 1;
}
